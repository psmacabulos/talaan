// @vitest-environment node
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaPushOutboxRepository } from "./prisma-push-outbox-repository";

/**
 * The push outbox's SQL, checked against real Postgres (Step 54): the mock
 * can't show that the claims skip each other's rows, that the phone lookup
 * leaves out revoked sign-ins, or that dates come back as dates. Rows are
 * its own (ids starting "push-test-"), removed afterwards. Other rows in
 * the browser-test database may be claimed along the way, which is
 * harmless there. Skipped, not failed, when E2E_DATABASE_URL isn't set.
 */
const url = process.env.E2E_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;

const BALANGA = "school-balanga";
const CHILD = "student-0003";
const PARENT = "push-test-parent";
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const RULES = { maxAgeMs: 6 * HOUR, signInUnusedMs: 30 * DAY };

describeWithDatabase("push outbox on Postgres (Step 54; needs E2E_DATABASE_URL)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const outbox = createPrismaPushOutboxRepository(db);

  async function cleanUp() {
    await db.notification.deleteMany({ where: { id: { startsWith: "push-test-" } } });
    await db.parentStudentLink.deleteMany({ where: { parentId: PARENT } });
    // Its sign-ins, push addresses and their deliveries go with it.
    await db.parent.deleteMany({ where: { id: PARENT } });
  }

  /** Fans out until nothing is left to claim, so this test's rows are done whatever else is waiting. */
  async function fanOutAll() {
    for (let round = 0; round < 50; round++) {
      if ((await outbox.fanOut(100, RULES)).notifications === 0) return;
    }
  }

  beforeAll(async () => {
    await cleanUp();
    await db.parent.create({
      data: {
        id: PARENT,
        firstName: "Push",
        lastName: "Test",
        mobile: "09170000000",
        email: "push-test@example.com",
        passwordHash: "not-a-real-hash",
        tokens: {
          create: [
            {
              id: "push-test-live",
              tokenHash: "push-test-live",
              pushToken: {
                create: { id: "push-test-phone", token: "ExponentPushToken[push-test-live]", platform: "android" },
              },
            },
            {
              id: "push-test-revoked",
              tokenHash: "push-test-revoked",
              revokedAt: new Date(),
              pushToken: {
                create: { id: "push-test-old-phone", token: "ExponentPushToken[push-test-revoked]", platform: "ios" },
              },
            },
            {
              // Not opened for 31 days (Step 54.1): no more pushes, and cleared.
              id: "push-test-stale",
              tokenHash: "push-test-stale",
              lastUsedAt: new Date(Date.now() - 31 * DAY),
              pushToken: {
                create: {
                  id: "push-test-stale-phone",
                  token: "ExponentPushToken[push-test-stale]",
                  platform: "android",
                },
              },
            },
          ],
        },
      },
    });
    await db.parentStudentLink.create({
      data: { id: "push-test-link", schoolId: BALANGA, parentId: PARENT, studentId: CHILD },
    });
    await db.notification.createMany({
      data: [
        {
          id: "push-test-now",
          schoolId: BALANGA,
          studentId: CHILD,
          kind: "time_in",
          tappedAt: new Date("2026-06-19T23:56:00.000Z"),
        },
        {
          id: "push-test-receipt",
          schoolId: BALANGA,
          studentId: CHILD,
          kind: "time_out",
          tappedAt: new Date("2026-06-19T08:10:00.000Z"),
          pushedAt: new Date(),
        },
        {
          id: "push-test-old",
          schoolId: BALANGA,
          studentId: CHILD,
          kind: "time_out",
          tappedAt: new Date("2026-06-19T08:05:00.000Z"),
          createdAt: new Date(Date.now() - 7 * HOUR),
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanUp();
    await db.$disconnect();
  });

  it("makes one delivery per live push address, none for a revoked or 30-day-unused sign-in or an old notification", async () => {
    await fanOutAll();

    const deliveries = await db.pushDelivery.findMany({
      where: { notificationId: { in: ["push-test-now", "push-test-old"] } },
    });
    expect(
      deliveries.map(({ notificationId, pushTokenId, status }) => ({ notificationId, pushTokenId, status })),
    ).toEqual([{ notificationId: "push-test-now", pushTokenId: "push-test-phone", status: "waiting" }]);
    const old = await db.notification.findUniqueOrThrow({ where: { id: "push-test-old" } });
    expect(old.pushedAt).toBeInstanceOf(Date);

    // Already pushed: a second fan-out makes nothing more.
    await fanOutAll();
    await expect(db.pushDelivery.count({ where: { notificationId: "push-test-now" } })).resolves.toBe(1);
  });

  it("never gives two claims the same delivery, and carries what the message needs", async () => {
    const [first, second] = await Promise.all([outbox.claimDue(100, 2 * 60_000), outbox.claimDue(100, 2 * 60_000)]);
    const firstIds = new Set(first.map((delivery) => delivery.id));
    expect(second.filter((delivery) => firstIds.has(delivery.id))).toEqual([]);

    const ours = [...first, ...second].find((delivery) => delivery.notificationId === "push-test-now");
    expect(ours).toMatchObject({
      pushTokenId: "push-test-phone",
      token: "ExponentPushToken[push-test-live]",
      tries: 0,
      studentId: CHILD,
      kind: "time_in",
      tappedAt: "2026-06-19T23:56:00.000Z",
    });
    expect(ours!.ageMs).toBeGreaterThanOrEqual(0);
    expect(ours!.childFirstName.length).toBeGreaterThan(0);
  });

  it("saves a retry for later, takes back a crashed send, then saves it sent", async () => {
    const row = await db.pushDelivery.findFirstOrThrow({ where: { notificationId: "push-test-now" } });
    await outbox.saveResults([
      { id: row.id, outcome: "retry", retryInMs: 60_000, countsAsTry: true, error: "timeout" },
    ]);
    const waiting = await db.pushDelivery.findUniqueOrThrow({ where: { id: row.id } });
    expect(waiting).toMatchObject({ status: "waiting", tries: 1, lastError: "timeout", claimedUntil: null });
    expect(waiting.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 30_000);

    // A worker died mid-send: "sending", and its claim ran out a minute ago.
    await db.pushDelivery.update({
      where: { id: row.id },
      data: { status: "sending", claimedUntil: new Date(Date.now() - 60_000) },
    });
    const reclaimed = await outbox.claimDue(100, 2 * 60_000);
    expect(reclaimed.map((delivery) => delivery.id)).toContain(row.id);

    await outbox.saveResults([{ id: row.id, outcome: "sent", ticketId: "ticket-push-test", receiptInMs: 15 * 60_000 }]);
    const sent = await db.pushDelivery.findUniqueOrThrow({ where: { id: row.id } });
    expect(sent).toMatchObject({ status: "sent", ticketId: "ticket-push-test", claimedUntil: null });
    expect(sent.sentAt).toBeInstanceOf(Date);
    // Its receipt is asked for in 15 minutes (Step 54.1).
    expect(sent.receiptDueAt!.getTime()).toBeGreaterThan(Date.now() + 14 * 60_000);
  });

  it("finds the receipts that are due, and saves each outcome (Step 54.1)", async () => {
    const sentRow = (id: string) =>
      db.pushDelivery.create({
        data: {
          id,
          notificationId: "push-test-receipt",
          pushTokenId: id === "push-test-receipt-a" ? "push-test-phone" : "push-test-stale-phone",
          status: "sent",
          ticketId: `ticket-${id}`,
          sentAt: new Date(Date.now() - 20 * 60_000),
          receiptDueAt: new Date(Date.now() - 60_000),
        },
      });
    await sentRow("push-test-receipt-a");
    await sentRow("push-test-receipt-b");

    const due = await outbox.receiptsDue(1_000);
    const ours = due.filter((row) => row.id.startsWith("push-test-receipt-"));
    expect(ours.map((row) => row.ticketId).sort()).toEqual([
      "ticket-push-test-receipt-a",
      "ticket-push-test-receipt-b",
    ]);
    expect(ours[0].sentAgeMs).toBeGreaterThan(19 * 60_000);
    expect(ours[0].notificationAgeMs).toBeGreaterThanOrEqual(0);

    // Not ready: asked again in 15 minutes. Too busy: back to waiting, to be sent again.
    await outbox.saveReceipts(
      [
        { id: "push-test-receipt-a", outcome: "not_ready" },
        { id: "push-test-receipt-b", outcome: "resend" },
      ],
      15 * 60_000,
    );
    const later = await db.pushDelivery.findUniqueOrThrow({ where: { id: "push-test-receipt-a" } });
    expect(later.receiptDueAt!.getTime()).toBeGreaterThan(Date.now() + 14 * 60_000);
    await expect(db.pushDelivery.findUniqueOrThrow({ where: { id: "push-test-receipt-b" } })).resolves.toMatchObject({
      status: "waiting",
      receiptDueAt: null,
      ticketId: null,
    });

    // Delivered: the row is deleted. Nothing about a success is kept.
    await db.pushDelivery.update({ where: { id: "push-test-receipt-a" }, data: { receiptDueAt: new Date() } });
    await outbox.saveReceipts([{ id: "push-test-receipt-a", outcome: "delivered" }], 15 * 60_000);
    await expect(db.pushDelivery.count({ where: { id: "push-test-receipt-a" } })).resolves.toBe(0);
    // A second save of the same outcome changes nothing more.
    await outbox.saveReceipts([{ id: "push-test-receipt-a", outcome: "delivered" }], 15 * 60_000);
  });

  it("clears failed pushes after 7 days and sign-ins unused for 30 days, nothing younger (Step 54.1)", async () => {
    await db.pushDelivery.createMany({
      data: [
        {
          id: "push-test-failed-old",
          notificationId: "push-test-old",
          pushTokenId: "push-test-phone",
          status: "failed",
          nextAttemptAt: new Date(Date.now() - 8 * DAY),
        },
        {
          id: "push-test-failed-young",
          notificationId: "push-test-receipt",
          pushTokenId: "push-test-phone",
          status: "failed",
          nextAttemptAt: new Date(Date.now() - DAY),
        },
      ],
    });

    await outbox.cleanUp({ failedKeepMs: 7 * DAY, signInUnusedMs: 30 * DAY, batch: 1_000, maxBatches: 20 });

    const left = await db.pushDelivery.findMany({ where: { id: { startsWith: "push-test-failed-" } } });
    expect(left.map((row) => row.id)).toEqual(["push-test-failed-young"]);
    const signIns = await db.parentToken.findMany({ where: { parentId: PARENT }, select: { id: true } });
    expect(signIns.map((row) => row.id)).toEqual(["push-test-live"]);
    await expect(db.pushToken.count({ where: { id: "push-test-stale-phone" } })).resolves.toBe(0);
  });

  it("drops a phone that's gone, with its deliveries", async () => {
    const row = await db.pushDelivery.findFirstOrThrow({ where: { notificationId: "push-test-now" } });
    await outbox.saveResults([{ id: row.id, outcome: "gone", pushTokenId: "push-test-phone" }]);
    await expect(db.pushToken.count({ where: { id: "push-test-phone" } })).resolves.toBe(0);
    await expect(db.pushDelivery.count({ where: { id: row.id } })).resolves.toBe(0);
  });
});
