import { describe, expect, it } from "vitest";
import type { Student } from "@/features/students/types";
import type { Tap } from "./types";
import {
  attendanceByGrade,
  countByStatus,
  formatTapTime,
  studentStatus,
  studentsWithoutTapToday,
} from "./status";

const NOW = "2026-06-20T09:15:00Z";

function student(id: string, gradeLevel: Student["gradeLevel"]): Student {
  return {
    id,
    schoolId: "school-a",
    firstName: "Test",
    lastName: id,
    birthDate: "2012-01-01",
    gradeLevel,
    section: "Rizal",
    guardianName: "Guardian",
    guardianMobile: "09171234567",
  };
}

function tap(studentId: string, tappedAt: string): Tap {
  return {
    id: `tap-${studentId}-${tappedAt}`,
    schoolId: "school-a",
    stationId: "station-main-gate",
    cardSerial: "04:A3:5F:2B:91:C0:80",
    studentId,
    tappedAt,
  };
}

describe("studentStatus", () => {
  it("is present for a tap at or before the late cutoff", () => {
    expect(studentStatus("s1", [tap("s1", "2026-06-20T08:05:00Z")], NOW)).toBe("present");
  });

  it("is late for a tap after the late cutoff", () => {
    expect(studentStatus("s1", [tap("s1", "2026-06-20T08:06:00Z")], NOW)).toBe("late");
  });

  it("is idle (not yet tapped) before the absent cutoff with no tap", () => {
    expect(studentStatus("s1", [], "2026-06-20T08:59:00Z")).toBe("idle");
  });

  it("is absent at or after the absent cutoff with no tap", () => {
    expect(studentStatus("s1", [], "2026-06-20T09:00:00Z")).toBe("absent");
  });

  it("ignores another student's tap", () => {
    expect(studentStatus("s1", [tap("s2", "2026-06-20T07:00:00Z")], NOW)).toBe("absent");
  });

  it("ignores a tap from a different day", () => {
    expect(studentStatus("s1", [tap("s1", "2026-06-19T07:00:00Z")], NOW)).toBe("absent");
  });

  it("uses the earliest of two same-day taps", () => {
    const taps = [tap("s1", "2026-06-20T08:00:00Z"), tap("s1", "2026-06-20T07:00:00Z")];
    expect(studentStatus("s1", taps, NOW)).toBe("present");
  });
});

describe("countByStatus", () => {
  it("tallies every student into exactly one bucket", () => {
    const students = [student("s1", 7), student("s2", 7), student("s3", 7)];
    const taps = [tap("s1", "2026-06-20T07:00:00Z"), tap("s2", "2026-06-20T08:30:00Z")];
    expect(countByStatus(students, taps, NOW)).toEqual({ present: 1, late: 1, absent: 1, idle: 0 });
  });
});

describe("attendanceByGrade", () => {
  it("returns one row per grade level actually present, sorted", () => {
    const students = [student("s1", 9), student("s2", 7), student("s3", 7)];
    const rows = attendanceByGrade(students, [], NOW);
    expect(rows.map((row) => row.gradeLevel)).toEqual([7, 9]);
  });

  it("computes the in-school percent as present+late over the grade's total", () => {
    const students = [student("s1", 7), student("s2", 7)];
    const taps = [tap("s1", "2026-06-20T07:00:00Z")];
    const [row] = attendanceByGrade(students, taps, NOW);
    expect(row.studentCount).toBe(2);
    expect(row.inSchoolPercent).toBe(50);
  });
});

describe("studentsWithoutTapToday", () => {
  it("lists idle students before absent ones", () => {
    const students = [student("s1", 7), student("s2", 7), student("s3", 7)];
    const taps = [tap("s1", "2026-06-20T07:00:00Z")];
    // s2/s3 have no tap; at NOW (09:15, past the absent cutoff) both read
    // as absent, so this also exercises "no idle students left" below.
    const result = studentsWithoutTapToday(students, taps, "2026-06-20T08:00:00Z");
    expect(result.map((s) => s.id)).toEqual(["s2", "s3"]);
  });

  it("excludes students who already tapped", () => {
    const students = [student("s1", 7), student("s2", 7)];
    const taps = [tap("s1", "2026-06-20T07:00:00Z")];
    expect(studentsWithoutTapToday(students, taps, NOW).map((s) => s.id)).toEqual(["s2"]);
  });
});

describe("formatTapTime", () => {
  it("formats a morning time", () => {
    expect(formatTapTime("2026-06-20T07:56:00Z")).toBe("7:56 AM");
  });

  it("formats noon as 12 PM", () => {
    expect(formatTapTime("2026-06-20T12:00:00Z")).toBe("12:00 PM");
  });

  it("formats midnight as 12 AM", () => {
    expect(formatTapTime("2026-06-20T00:05:00Z")).toBe("12:05 AM");
  });

  it("formats an afternoon time", () => {
    expect(formatTapTime("2026-06-20T14:30:00Z")).toBe("2:30 PM");
  });
});
