// @vitest-environment node
import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaParentStudentLinkRepository } from "./prisma-parent-student-link-repository";

/**
 * Step 55.4's "Remove" and "Allow again" against real Postgres: that the
 * removal takes the removed parent's queued pushes about the child (and
 * nothing else), that two removals at once don't collide, and that the
 * block holds inside the link's own transaction. Its parents, links,
 * notifications and pushes are its own (ids starting "link-block-test-"),
 * on seed children nobody is linked to, all removed afterwards. Skipped, not
 * failed, when E2E_DATABASE_URL isn't set.
 */
const url = process.env.E2E_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;

const PREFIX = "link-block-test-";
const BALANGA = "school-balanga";
const OCEANVIEW = "school-oceanview";
/** The parent the school removes, and the child's other guardian. */
const REMOVED = `${PREFIX}removed`;
const OTHER = `${PREFIX}other`;

describeWithDatabase("link blocks on Postgres (Step 55.4; needs E2E_DATABASE_URL)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const links = createPrismaParentStudentLinkRepository(db);
  let child: string;
  let otherChild: string;
  let principal: string;

  function linkFor(parentId: string, studentId = child) {
    return { id: crypto.randomUUID(), schoolId: BALANGA, parentId, studentId, linkedAt: new Date().toISOString() };
  }

  async function cleanUp() {
    await db.notification.deleteMany({ where: { id: { startsWith: PREFIX } } });
    await db.notification.deleteMany({ where: { recipientParentId: { in: [REMOVED, OTHER] } } });
    await db.linkBlock.deleteMany({ where: { parentId: { in: [REMOVED, OTHER] } } });
    await db.parentStudentLink.deleteMany({ where: { parentId: { in: [REMOVED, OTHER] } } });
  }

  /** A tap notification about `studentId`, already fanned out, with a delivery to `pushTokenId` in `status`. */
  async function delivery(id: string, studentId: string, pushTokenId: string, status: "waiting" | "sending" | "sent") {
    await db.notification.create({
      data: {
        id: `${PREFIX}${id}`,
        schoolId: BALANGA,
        studentId,
        kind: "time_in",
        tappedAt: new Date(),
        pushedAt: new Date(),
        deliveries: { create: { id: `${PREFIX}${id}`, pushTokenId, status } },
      },
    });
  }

  beforeAll(async () => {
    const unlinked = await db.student.findMany({
      where: { schoolId: BALANGA, parentLinks: { none: {} } },
      select: { id: true },
      orderBy: { id: "asc" },
      take: 2,
    });
    [child, otherChild] = unlinked.map((student) => student.id);
    principal = (await db.staff.findFirstOrThrow({ where: { schoolId: BALANGA, role: "principal" } })).id;

    await db.parent.deleteMany({ where: { id: { in: [REMOVED, OTHER] } } });
    for (const id of [REMOVED, OTHER]) {
      await db.parent.create({
        data: {
          id,
          firstName: "Test",
          lastName: id,
          mobile: "09170000000",
          email: `${id}@example.com`,
          passwordHash: "not-a-real-hash",
          tokens: {
            create: {
              id: `${id}-sign-in`,
              tokenHash: `${id}-sign-in`,
              pushToken: { create: { id: `${id}-phone`, token: `ExponentPushToken[${id}]`, platform: "android" } },
            },
          },
        },
      });
    }
  });

  beforeEach(async () => {
    await cleanUp();
    await links.createWithNotices(linkFor(OTHER));
    await links.createWithNotices(linkFor(REMOVED));
  });

  afterAll(async () => {
    await cleanUp();
    // Their sign-ins and push addresses go with them.
    await db.parent.deleteMany({ where: { id: { in: [REMOVED, OTHER] } } });
    await db.$disconnect();
  });

  async function removedLinkId() {
    return (await db.parentStudentLink.findFirstOrThrow({ where: { parentId: REMOVED, studentId: child } })).id;
  }

  it("removes the link, blocks the parent, and drops only their pushes about that child that haven't gone", async () => {
    await delivery("waiting", child, `${REMOVED}-phone`, "waiting");
    await delivery("sending", child, `${REMOVED}-phone`, "sending");
    await delivery("sent", child, `${REMOVED}-phone`, "sent");
    await delivery("other-child", otherChild, `${REMOVED}-phone`, "waiting");
    await delivery("other-guardian", child, `${OTHER}-phone`, "waiting");

    await expect(links.removeInSchool(BALANGA, await removedLinkId(), principal)).resolves.toEqual({
      parentId: REMOVED,
      studentId: child,
    });

    await expect(db.parentStudentLink.count({ where: { parentId: REMOVED, studentId: child } })).resolves.toBe(0);
    await expect(
      db.linkBlock.findUnique({ where: { parentId_studentId: { parentId: REMOVED, studentId: child } } }),
    ).resolves.toMatchObject({ schoolId: BALANGA, removedByStaffId: principal });
    const left = await db.pushDelivery.findMany({ where: { id: { startsWith: PREFIX } }, orderBy: { id: "asc" } });
    expect(left.map((row) => row.id.slice(PREFIX.length))).toEqual(["other-child", "other-guardian", "sent"]);
  });

  it("lets only one of two removals at once through, with one block and no clash", async () => {
    const linkId = await removedLinkId();
    const results = await Promise.all([
      links.removeInSchool(BALANGA, linkId, principal),
      links.removeInSchool(BALANGA, linkId, principal),
    ]);
    expect(results.filter((result) => result === null)).toHaveLength(1);
    await expect(db.linkBlock.count({ where: { parentId: REMOVED, studentId: child } })).resolves.toBe(1);
  });

  it("keeps a removed parent from linking again, then lets them after Allow again", async () => {
    await links.removeInSchool(BALANGA, await removedLinkId(), principal);

    await expect(links.createWithNotices(linkFor(REMOVED))).resolves.toEqual({ outcome: "blocked" });
    await expect(db.parentStudentLink.count({ where: { parentId: REMOVED, studentId: child } })).resolves.toBe(0);

    const [block] = await links.listBlocksInSchool(BALANGA, [child]);
    expect(block).toMatchObject({ parent: { lastName: REMOVED }, removedBy: { firstName: expect.any(String) } });
    await expect(links.allowAgainInSchool(BALANGA, block.blockId)).resolves.toBe(true);

    // Linking again tells the other guardian again.
    await expect(links.createWithNotices(linkFor(REMOVED))).resolves.toMatchObject({
      outcome: "linked",
      noticesMade: 1,
    });
  });

  it("removes and allows nothing for another school", async () => {
    const linkId = await removedLinkId();
    await expect(links.removeInSchool(OCEANVIEW, linkId, principal)).resolves.toBeNull();
    await expect(db.parentStudentLink.count({ where: { id: linkId } })).resolves.toBe(1);

    await links.removeInSchool(BALANGA, linkId, principal);
    const [block] = await links.listBlocksInSchool(BALANGA, [child]);
    await expect(links.listBlocksInSchool(OCEANVIEW, [child])).resolves.toEqual([]);
    await expect(links.allowAgainInSchool(OCEANVIEW, block.blockId)).resolves.toBe(false);
    await expect(db.linkBlock.count({ where: { id: block.blockId } })).resolves.toBe(1);
  });
});
