import { describe, expect, it } from "vitest";
import type { Tap } from "@/features/attendance/types";
import type { CardTap } from "@/services/taps/record-tap";
import { schoolTimeToIso } from "@/lib/school-time";
import { createMockTapRepository } from "./tap-repository";

const DAY = "2026-06-20";

const tapA: CardTap = {
  id: "00000000-0000-4000-8000-000000000001",
  schoolId: "school-a",
  stationId: "station-main-gate",
  cardSerial: "04:A3:5F:2B:91:C0:80",
  studentId: "student-a",
  tappedAt: schoolTimeToIso(DAY, "07:56"),
};

const tapB: Tap = {
  id: "00000000-0000-4000-8000-000000000002",
  schoolId: "school-b",
  stationId: "station-main-gate",
  cardSerial: "04:11:22:33:44:55:66",
  studentId: "student-b",
  tappedAt: schoolTimeToIso(DAY, "07:57"),
};

const unknownCardTap: Tap = {
  id: "00000000-0000-4000-8000-000000000003",
  schoolId: "school-a",
  stationId: "station-main-gate",
  cardSerial: "04:FF:FF:FF:FF:FF:FF",
  studentId: null,
  tappedAt: schoolTimeToIso(DAY, "08:10"),
};

const allTaps = [tapA, tapB, unknownCardTap];

describe("createMockTapRepository", () => {
  it("finds a card's tap strictly inside a time window, at that school only", async () => {
    const repo = createMockTapRepository(allTaps, { latencyMs: 0 });
    const window = (from: string, to: string) =>
      repo.findByCardBetween("school-a", tapA.cardSerial, schoolTimeToIso(DAY, from), schoolTimeToIso(DAY, to));
    await expect(window("07:54", "07:58")).resolves.toEqual(tapA);
    // The edges themselves don't count.
    await expect(window("07:56", "07:58")).resolves.toBeNull();
    await expect(window("07:54", "07:56")).resolves.toBeNull();
    await expect(
      repo.findByCardBetween("school-b", tapA.cardSerial, schoolTimeToIso(DAY, "07:00"), schoolTimeToIso(DAY, "09:00")),
    ).resolves.toBeNull();
  });

  it("lists a school's taps on one school day only", async () => {
    const repo = createMockTapRepository(allTaps, { latencyMs: 0 });
    await expect(repo.listBySchoolOnDate("school-a", DAY)).resolves.toEqual([tapA, unknownCardTap]);
    await expect(repo.listBySchoolOnDate("school-a", "2026-06-21")).resolves.toEqual([]);
  });

  it("counts an early-morning tap for the school's day, though it's the day before in UTC", async () => {
    // 7:56 AM in the Philippines is 23:56 UTC on the 19th.
    expect(tapA.tappedAt.startsWith("2026-06-19")).toBe(true);
    const repo = createMockTapRepository(allTaps, { latencyMs: 0 });
    await expect(repo.listBySchoolOnDate("school-a", "2026-06-19")).resolves.toEqual([]);
  });

  it("finds one tap by id, or null", async () => {
    const repo = createMockTapRepository(allTaps, { latencyMs: 0 });
    await expect(repo.getById(tapB.id)).resolves.toEqual(tapB);
    await expect(repo.getById("00000000-0000-4000-8000-00000000ffff")).resolves.toBeNull();
  });

  it("lists a student's taps only", async () => {
    const repo = createMockTapRepository(allTaps, { latencyMs: 0 });
    await expect(repo.listByStudent("school-a", "student-a")).resolves.toEqual([tapA]);
  });

  it("never reaches another school's taps (Step 51)", async () => {
    const repo = createMockTapRepository(allTaps, { latencyMs: 0 });
    await expect(repo.listByStudent("school-b", "student-a")).resolves.toEqual([]);
    await expect(repo.getInSchool("school-b", tapA.id)).resolves.toBeNull();
    await expect(repo.getInSchool("school-a", tapA.id)).resolves.toEqual(tapA);
  });

  it("returns an empty list for a school/student with no taps", async () => {
    const repo = createMockTapRepository(allTaps, { latencyMs: 0 });
    await expect(repo.listBySchoolOnDate("school-none", DAY)).resolves.toEqual([]);
  });

  it("listByStudentOnDate() gives one student's day at one school, earliest first", async () => {
    const later = { ...tapA, id: "00000000-0000-4000-8000-000000000010", tappedAt: schoolTimeToIso(DAY, "16:05") };
    const nextDay = {
      ...tapA,
      id: "00000000-0000-4000-8000-000000000011",
      tappedAt: schoolTimeToIso("2026-06-21", "07:50"),
    };
    const repo = createMockTapRepository([later, tapA, nextDay, tapB], { latencyMs: 0 });

    await expect(repo.listByStudentOnDate("school-a", "student-a", DAY)).resolves.toEqual([tapA, later]);
    await expect(repo.listByStudentOnDate("school-b", "student-a", DAY)).resolves.toEqual([]);
  });

  it("listRecentByStudent() gives the newest few, newest first, at one school", async () => {
    const later = { ...tapA, id: "00000000-0000-4000-8000-000000000010", tappedAt: schoolTimeToIso(DAY, "16:05") };
    const nextDay = {
      ...tapA,
      id: "00000000-0000-4000-8000-000000000011",
      tappedAt: schoolTimeToIso("2026-06-21", "07:50"),
    };
    const repo = createMockTapRepository([tapA, later, nextDay, tapB], { latencyMs: 0 });

    await expect(repo.listRecentByStudent("school-a", "student-a", 2)).resolves.toEqual([nextDay, later]);
    await expect(repo.listRecentByStudent("school-b", "student-a", 2)).resolves.toEqual([]);
  });
});
