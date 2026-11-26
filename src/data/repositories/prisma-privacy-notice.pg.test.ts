// @vitest-environment node
import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { createPrismaPrivacyNoticeRepository } from "./prisma-privacy-notice-repository";

/**
 * Step 60.4's notices against real Postgres: version numbers, the race
 * between two publishes, the event written in the same transaction, and
 * the migration's CHECKs are all database behaviour. Its two schools are
 * its own (ids starting "pnt-"), so no other test file's rows are touched
 * (P-071); deleting them takes their notices and events with them.
 * Skipped, not failed, when E2E_DATABASE_URL isn't set.
 */
const url = process.env.E2E_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;

const SCHOOL = "pnt-school";
const OTHER = "pnt-other-school";
const ACTOR = { id: "pnt-principal", role: "principal" as const };
const text = (n: number) => `Version ${n} of the notice. ${"This school keeps attendance. ".repeat(8)}`.trim();

describeWithDatabase("privacy notices on Postgres (Step 60.4; needs E2E_DATABASE_URL)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const notices = createPrismaPrivacyNoticeRepository(db);

  async function removeSchools() {
    await db.school.deleteMany({ where: { id: { in: [SCHOOL, OTHER] } } });
  }

  const events = () => db.auditEvent.findMany({ where: { schoolId: SCHOOL, action: "privacy_notice_published" } });

  beforeAll(async () => {
    await removeSchools();
    for (const id of [SCHOOL, OTHER]) {
      await db.school.create({ data: { id, name: id, theme: { preset: "school" } } });
    }
  });

  beforeEach(async () => {
    await db.privacyNotice.deleteMany({ where: { schoolId: { in: [SCHOOL, OTHER] } } });
    await db.auditEvent.deleteMany({ where: { schoolId: { in: [SCHOOL, OTHER] } } });
  });

  afterAll(async () => {
    await removeSchools();
    await db.$disconnect();
  });

  it("numbers versions 1, 2, 3, each with its own event, and reads this school's only", async () => {
    await db.privacyNotice.create({ data: { schoolId: OTHER, version: 1, body: text(99) } });

    for (const version of [1, 2, 3]) {
      await expect(notices.publish(SCHOOL, text(version), version - 1, ACTOR)).resolves.toEqual({ ok: true, version });
    }

    const current = await notices.current(SCHOOL);
    expect(current).toMatchObject({ schoolId: SCHOOL, version: 3, body: text(3) });
    expect((await notices.versions(SCHOOL)).map((v) => v.version)).toEqual([3, 2, 1]);
    expect(await notices.current("pnt-no-such-school")).toBeNull();

    const written = await events();
    expect(written).toHaveLength(3);
    expect(written.every((event) => event.actorId === ACTOR.id && event.targetId === SCHOOL)).toBe(true);
    expect(written.every((event) => event.details === null)).toBe(true);

    // The other school's notice is untouched.
    expect(await notices.current(OTHER)).toMatchObject({ version: 1, body: text(99) });
  });

  it("answers stale for an older version, or a made-up newer one, and writes nothing", async () => {
    await notices.publish(SCHOOL, text(1), 0, ACTOR);
    await notices.publish(SCHOOL, text(2), 1, ACTOR);

    await expect(notices.publish(SCHOOL, text(9), 1, ACTOR)).resolves.toEqual({ ok: false, reason: "stale" });
    // Ahead of the newest: without the check this would write version 8 and leave a gap.
    await expect(notices.publish(SCHOOL, text(9), 7, ACTOR)).resolves.toEqual({ ok: false, reason: "stale" });

    expect((await notices.versions(SCHOOL)).map((v) => v.version)).toEqual([2, 1]);
    expect(await events()).toHaveLength(2);
  });

  it("lets exactly one of two publishes from the same version win, with one event", async () => {
    await notices.publish(SCHOOL, text(1), 0, ACTOR);

    const outcomes = await Promise.all([
      notices.publish(SCHOOL, text(21), 1, ACTOR),
      notices.publish(SCHOOL, text(22), 1, ACTOR),
    ]);

    expect(outcomes.filter((outcome) => outcome.ok)).toEqual([{ ok: true, version: 2 }]);
    expect(outcomes.filter((outcome) => !outcome.ok)).toEqual([{ ok: false, reason: "stale" }]);
    expect((await notices.versions(SCHOOL)).map((v) => v.version)).toEqual([2, 1]);
    expect(await events()).toHaveLength(2);
  });

  it("never selects the text for the versions list", async () => {
    await notices.publish(SCHOOL, text(1), 0, ACTOR);

    const [version] = await notices.versions(SCHOOL);
    expect(Object.keys(version).sort()).toEqual(["publishedAt", "version"]);
  });

  it("refuses a version below 1 and a text over 20,000 characters in the database itself", async () => {
    await expect(db.privacyNotice.create({ data: { schoolId: SCHOOL, version: 0, body: text(0) } })).rejects.toThrow(
      /PrivacyNotice_version_positive/,
    );
    await expect(
      db.privacyNotice.create({ data: { schoolId: SCHOOL, version: 1, body: "x".repeat(20_001) } }),
    ).rejects.toThrow(/PrivacyNotice_body_length/);
  });

  it("finds the newest version through the unique index", async () => {
    await notices.publish(SCHOOL, text(1), 0, ACTOR);

    // A tiny table may be read whole; told not to, the planner must use the
    // index. SET LOCAL inside one transaction, so both run on one connection
    // and the setting ends with it.
    const plan = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL enable_seqscan = off`;
      return tx.$queryRaw<{ "QUERY PLAN": string }[]>(
        Prisma.sql`EXPLAIN SELECT "version" FROM "PrivacyNotice" WHERE "schoolId" = ${SCHOOL} ORDER BY "version" DESC LIMIT 1`,
      );
    });

    expect(plan.map((row) => row["QUERY PLAN"]).join("\n")).toMatch(/PrivacyNotice_schoolId_version_key/);
  });
});
