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
import { manualTimeOutId, recordManualTimeOut } from "./record-manual-time-out";

/**
 * A time out recorded by hand, against real Postgres (Step 59.4): after a
 * time in, two clicks at the same moment must make one time out and at
 * most one parent notification. On a school day far ahead that no other
 * database test uses, not even part of: test files run at the same time, and
 * Step 56's test counts every Balanga tap from 2031-03-05 00:00 UTC to the
 * next midnight, which a time in on the school's 2031-03-06 fell inside
 * (P-055). Its rows are removed afterwards. Skipped, not failed, when
 * E2E_DATABASE_URL isn't set.
 */
const url = process.env.E2E_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;

const SCHOOL = "school-balanga";
const PRINCIPAL = "staff-principal-school-balanga";
const STUDENT = "student-0003";
const TIME_IN = "2031-03-11T23:10:00.000Z"; // 7:10 AM on the 12th at the school
const TIME_OUT = "2031-03-12T08:00:00.000Z"; // 4:00 PM
const DATE = "2031-03-12";

describeWithDatabase("recordManualTimeOut on Postgres (Step 59.4; needs E2E_DATABASE_URL)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const deps: ManualTimeInDeps = {
    students: createPrismaStudentRepository(db),
    taps: createPrismaTapRepository(db),
    cards: createPrismaCardRepository(db),
    schools: createPrismaSchoolRepository(db),
    writer: createPrismaTapWriter(db),
  };

  async function cleanUp() {
    await db.notification.deleteMany({
      where: { studentId: STUDENT, tappedAt: { in: [new Date(TIME_IN), new Date(TIME_OUT)] } },
    });
    await db.tap.deleteMany({
      where: { id: { in: [manualTimeInId(STUDENT, DATE), manualTimeOutId(STUDENT, DATE, 1)] } },
    });
  }

  beforeAll(cleanUp);
  afterAll(async () => {
    await cleanUp();
    await db.$disconnect();
  });

  const input = (now: string) => ({
    schoolId: SCHOOL,
    studentId: STUDENT,
    staff: { id: PRINCIPAL, role: "principal" as const },
    now,
  });

  it("keeps one time out and at most one notification when two clicks arrive together", async () => {
    await expect(recordManualTimeIn(input(TIME_IN), deps)).resolves.toMatchObject({ outcome: "recorded" });

    const results = await Promise.all([
      recordManualTimeOut(input(TIME_OUT), deps),
      recordManualTimeOut(input(TIME_OUT), deps),
    ]);
    const recorded = results.filter((result) => result.outcome === "recorded");
    expect(recorded).toHaveLength(1);
    expect(results.filter((result) => result.outcome === "already_out")).toHaveLength(1);

    const stored = await deps.taps.listByStudentOnDate(SCHOOL, STUDENT, DATE);
    expect(stored.map((tap) => tap.tappedAt)).toEqual([TIME_IN, TIME_OUT]);
    expect(stored[1]).toMatchObject({ source: "manual", recordedById: PRINCIPAL, stationId: "manual" });

    const notifications = await db.notification.count({
      where: { studentId: STUDENT, tappedAt: new Date(TIME_OUT), kind: "time_out" },
    });
    expect(notifications).toBe(recorded[0].outcome === "recorded" && recorded[0].notified ? 1 : 0);
  });

  it("refuses a second time out once the student is out", async () => {
    await expect(recordManualTimeOut(input(TIME_OUT), deps)).resolves.toMatchObject({ outcome: "already_out" });
  });
});
