// @vitest-environment node
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  createPrismaCardRepository,
  createPrismaSchoolRepository,
  createPrismaStudentRepository,
  createPrismaTapRepository,
  createPrismaTapWriter,
} from "@/data/repositories";
import { PrismaClient } from "@/generated/prisma/client";
import { manualTimeInId, recordManualTimeIn, type ManualTimeInDeps } from "./record-manual-time-in";

/**
 * A time in recorded by hand, against real Postgres (Step 55): two clicks at
 * the same moment must make one tap and at most one parent notification,
 * which only the database's unique id can promise. On a date far ahead, so
 * no other test's taps are in the way; its rows are removed afterwards.
 * Skipped, not failed, when E2E_DATABASE_URL isn't set.
 */
const url = process.env.E2E_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;

const SCHOOL = "school-balanga";
const PRINCIPAL = "staff-principal-school-balanga";
const WITH_CARD = "student-0003";
const NO_CARD = "student-0010";
const NOW = "2031-03-04T01:10:00.000Z";
const DATE = "2031-03-04";

describeWithDatabase("recordManualTimeIn on Postgres (Step 55; needs E2E_DATABASE_URL)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const deps: ManualTimeInDeps = {
    students: createPrismaStudentRepository(db),
    taps: createPrismaTapRepository(db),
    cards: createPrismaCardRepository(db),
    schools: createPrismaSchoolRepository(db),
    writer: createPrismaTapWriter(db),
  };
  const cards = createPrismaCardRepository(db);

  async function cleanUp() {
    const studentIds = [WITH_CARD, NO_CARD];
    await db.notification.deleteMany({ where: { studentId: { in: studentIds }, tappedAt: new Date(NOW) } });
    await db.tap.deleteMany({ where: { id: { in: studentIds.map((id) => manualTimeInId(id, DATE)) } } });
  }

  beforeAll(cleanUp);
  afterAll(async () => {
    await cleanUp();
    await db.$disconnect();
  });

  const input = (studentId: string) => ({
    schoolId: SCHOOL,
    studentId,
    staff: { id: PRINCIPAL, role: "principal" as const },
    now: NOW,
  });

  it("keeps one tap and at most one notification when two clicks arrive together", async () => {
    const results = await Promise.all([
      recordManualTimeIn(input(WITH_CARD), deps),
      recordManualTimeIn(input(WITH_CARD), deps),
    ]);
    const recorded = results.filter((result) => result.outcome === "recorded");
    expect(recorded).toHaveLength(1);
    expect(results.filter((result) => result.outcome === "already_tapped")).toHaveLength(1);

    const taps = await db.tap.findMany({ where: { studentId: WITH_CARD, tappedAt: new Date(NOW) } });
    expect(taps).toHaveLength(1);
    expect(taps[0]).toMatchObject({ source: "manual", recordedById: PRINCIPAL, stationId: "manual" });

    const notifications = await db.notification.count({ where: { studentId: WITH_CARD, tappedAt: new Date(NOW) } });
    expect(notifications).toBe(recorded[0].outcome === "recorded" && recorded[0].notified ? 1 : 0);
  });

  it("saves the student's card serial, or none when they have no card", async () => {
    await expect(recordManualTimeIn(input(NO_CARD), deps)).resolves.toMatchObject({ outcome: "recorded" });
    const stored = await deps.taps.listByStudentOnDate(SCHOOL, NO_CARD, DATE);
    const activeCard = await cards.getActiveForStudent(SCHOOL, NO_CARD);
    expect(stored).toHaveLength(1);
    expect(stored[0].cardSerial).toBe(activeCard?.serial ?? null);
  });
});
