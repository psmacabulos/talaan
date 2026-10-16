import { describe, expect, it } from "vitest";
import { createMockParentStudentLinkRepository } from "@/data/repositories/parent-student-link-repository";
import { createMockSchoolRepository } from "@/data/repositories/school-repository";
import { createMockStudentRepository } from "@/data/repositories/student-repository";
import { createMockTapRepository } from "@/data/repositories/tap-repository";
import { studentStatus } from "@/features/attendance/status";
import type { Tap } from "@/features/attendance/types";
import type { School } from "@/features/schools/types";
import type { Student } from "@/features/students/types";
import { schoolTimeToIso } from "@/lib/school-time";
import { childrenToday, RECENT_TAP_COUNT, type ChildrenTodayDeps } from "./children-today";

const FRIDAY = "2026-06-19";
const SATURDAY = "2026-06-20";

const school: School = {
  id: "school-a",
  name: "School A",
  theme: { kind: "preset", presetId: "school" },
  showDepedLogo: false,
  notificationPreference: "time_in_only",
  lateAfter: "07:30",
  absentFrom: "09:00",
};

const juan: Student = {
  id: "student-juan",
  schoolId: "school-a",
  firstName: "Juan",
  lastName: "Dela Cruz",
  birthDate: "2012-03-14",
  gradeLevel: 8,
  section: "Rizal",
  guardianName: "Maria Dela Cruz",
  guardianMobile: "09171234567",
};

function tap(n: number, tappedAt: string): Tap {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    schoolId: "school-a",
    stationId: "station-main-gate",
    cardSerial: "04:A3:5F:2B:91:C0:80",
    studentId: juan.id,
    tappedAt,
  };
}

function deps(taps: Tap[], students: Student[] = [juan]): ChildrenTodayDeps {
  return {
    links: createMockParentStudentLinkRepository(
      [
        {
          id: "link-1",
          schoolId: "school-a",
          parentId: "parent-1",
          studentId: juan.id,
          linkedAt: "2026-06-01T00:00:00Z",
        },
      ],
      { latencyMs: 0 },
    ),
    students: createMockStudentRepository(students, { latencyMs: 0 }),
    schools: createMockSchoolRepository([school], { latencyMs: 0 }),
    taps: createMockTapRepository(taps, { latencyMs: 0 }),
  };
}

describe("childrenToday", () => {
  it("gives each child today's taps, judged by their own school's times", async () => {
    const taps = [tap(1, schoolTimeToIso(FRIDAY, "07:45")), tap(2, schoolTimeToIso("2026-06-18", "07:10"))];
    const [child] = await childrenToday("parent-1", schoolTimeToIso(FRIDAY, "10:00"), deps(taps));

    expect(child.todayTaps.map((t) => t.id)).toEqual([taps[0].id]);
    // 07:45 is after this school's 07:30, so late.
    expect(studentStatus(juan.id, child.todayTaps, child.day)).toBe("late");
    expect(child.school).toEqual(school);
  });

  it("splits the day at the school's midnight, not UTC's", async () => {
    // 15:59:59.999Z is 23:59:59.999 on Friday at UTC+8; 16:00:00.000Z is Saturday.
    const lastOfFriday = tap(1, "2026-06-19T15:59:59.999Z");
    const firstOfSaturday = tap(2, "2026-06-19T16:00:00.000Z");
    const [child] = await childrenToday(
      "parent-1",
      schoolTimeToIso(SATURDAY, "10:00"),
      deps([lastOfFriday, firstOfSaturday]),
    );
    expect(child.todayTaps.map((t) => t.id)).toEqual([firstOfSaturday.id]);
  });

  it("marks a weekend day flexible", async () => {
    const [child] = await childrenToday("parent-1", schoolTimeToIso(SATURDAY, "10:00"), deps([]));
    expect(child.day.flexible).toBe(true);
  });

  it("gives the newest taps as recent ones, no more than the limit", async () => {
    const taps = Array.from({ length: RECENT_TAP_COUNT + 5 }, (_, n) =>
      tap(n, new Date(Date.parse("2026-06-01T00:00:00Z") + n * 86_400_000).toISOString()),
    );
    const [child] = await childrenToday("parent-1", schoolTimeToIso(FRIDAY, "10:00"), deps(taps));

    expect(child.recentTaps).toHaveLength(RECENT_TAP_COUNT);
    expect(child.recentTaps[0].id).toBe(taps.at(-1)!.id);
  });

  it("leaves out a linked child who's no longer at the school", async () => {
    await expect(childrenToday("parent-1", schoolTimeToIso(FRIDAY, "10:00"), deps([], []))).resolves.toEqual([]);
  });
});
