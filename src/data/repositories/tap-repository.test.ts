import { describe, expect, it } from "vitest";
import type { Tap } from "@/features/attendance/types";
import { createMockTapRepository } from "./tap-repository";

const tapA: Tap = {
  id: "00000000-0000-4000-8000-000000000001",
  schoolId: "school-a",
  stationId: "station-main-gate",
  cardSerial: "04:A3:5F:2B:91:C0:80",
  studentId: "student-a",
  tappedAt: "2026-06-20T07:56:00Z",
};

const tapB: Tap = {
  id: "00000000-0000-4000-8000-000000000002",
  schoolId: "school-b",
  stationId: "station-main-gate",
  cardSerial: "04:11:22:33:44:55:66",
  studentId: "student-b",
  tappedAt: "2026-06-20T07:57:00Z",
};

const unknownCardTap: Tap = {
  id: "00000000-0000-4000-8000-000000000003",
  schoolId: "school-a",
  stationId: "station-main-gate",
  cardSerial: "04:FF:FF:FF:FF:FF:FF",
  studentId: null,
  tappedAt: "2026-06-20T08:10:00Z",
};

const allTaps = [tapA, tapB, unknownCardTap];

describe("createMockTapRepository", () => {
  it("lists a school's taps only", async () => {
    const repo = createMockTapRepository(allTaps, { latencyMs: 0 });
    await expect(repo.listBySchool("school-a")).resolves.toEqual([tapA, unknownCardTap]);
  });

  it("lists a student's taps only", async () => {
    const repo = createMockTapRepository(allTaps, { latencyMs: 0 });
    await expect(repo.listByStudent("student-a")).resolves.toEqual([tapA]);
  });

  it("returns an empty list for a school/student with no taps", async () => {
    const repo = createMockTapRepository(allTaps, { latencyMs: 0 });
    await expect(repo.listBySchool("school-none")).resolves.toEqual([]);
  });
});
