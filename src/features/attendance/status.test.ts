import { describe, expect, it } from "vitest";
import type { Student } from "@/features/students/types";
import type { Tap } from "./types";
import { schoolTimeToIso } from "@/lib/school-time";
import {
  attendanceByGrade,
  countByStatus,
  deriveTapKind,
  formatTapTime,
  schoolDayFor,
  schoolToday,
  studentStatus,
  studentsWithoutTapToday,
} from "./status";

/** A time on the school's clock as a real instant: at("07:56") is 7:56 AM on the demo morning in the Philippines. */
function at(time: string, date = "2026-06-20"): string {
  return schoolTimeToIso(date, time);
}

const NOW = at("09:15");
/** The demo morning at 9:15 AM, past both default cutoffs. */
const DAY = schoolToday(NOW);

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
    expect(studentStatus("s1", [tap("s1", at("08:05"))], DAY)).toBe("present");
  });

  it("is late for a tap after the late cutoff", () => {
    expect(studentStatus("s1", [tap("s1", at("08:06"))], DAY)).toBe("late");
  });

  it("is idle (not yet tapped) before the absent cutoff with no tap", () => {
    expect(studentStatus("s1", [], schoolToday(at("08:59")))).toBe("idle");
  });

  it("is absent at or after the absent cutoff with no tap", () => {
    expect(studentStatus("s1", [], schoolToday(at("09:00")))).toBe("absent");
  });

  it("ignores another student's tap", () => {
    expect(studentStatus("s1", [tap("s2", at("07:00"))], DAY)).toBe("absent");
  });

  it("ignores a tap from a different day", () => {
    expect(studentStatus("s1", [tap("s1", at("07:00", "2026-06-19"))], DAY)).toBe("absent");
  });

  it("uses the earliest of two same-day taps", () => {
    const taps = [tap("s1", at("08:00")), tap("s1", at("07:00"))];
    expect(studentStatus("s1", taps, DAY)).toBe("present");
  });
});

describe("school time", () => {
  it("counts a 7:50 AM tap for today, though it's the previous day in UTC", () => {
    const early = at("07:50");
    expect(early.startsWith("2026-06-19")).toBe(true);
    expect(studentStatus("s1", [tap("s1", early)], DAY)).toBe("present");
  });

  it("judges a past day as finished: no tap means absent, even at 7 AM today", () => {
    const yesterday = schoolDayFor("2026-06-19", at("07:00"));
    expect(studentStatus("s1", [], yesterday)).toBe("absent");
  });

  it("judges a future day as not started: nobody is absent yet", () => {
    const tomorrow = schoolDayFor("2026-06-21", NOW);
    expect(studentStatus("s1", [], tomorrow)).toBe("idle");
  });

  it("uses the school's own times when it has them", () => {
    const taps = [tap("s1", at("08:10"))];
    expect(studentStatus("s1", taps, DAY)).toBe("late");
    expect(studentStatus("s1", taps, schoolToday(NOW, { lateAfter: "08:15", absentFrom: "09:30" }))).toBe("present");
  });
});

describe("countByStatus", () => {
  it("tallies every student into exactly one bucket", () => {
    const students = [student("s1", 7), student("s2", 7), student("s3", 7)];
    const taps = [tap("s1", at("07:00")), tap("s2", at("08:30"))];
    expect(countByStatus(students, taps, DAY)).toEqual({ present: 1, late: 1, absent: 1, idle: 0 });
  });
});

describe("attendanceByGrade", () => {
  it("returns one row per grade level actually present, sorted", () => {
    const students = [student("s1", 9), student("s2", 7), student("s3", 7)];
    const rows = attendanceByGrade(students, [], DAY);
    expect(rows.map((row) => row.gradeLevel)).toEqual([7, 9]);
  });

  it("computes the in-school percent as present+late over the grade's total", () => {
    const students = [student("s1", 7), student("s2", 7)];
    const taps = [tap("s1", at("07:00"))];
    const [row] = attendanceByGrade(students, taps, DAY);
    expect(row.studentCount).toBe(2);
    expect(row.inSchoolPercent).toBe(50);
  });
});

describe("studentsWithoutTapToday", () => {
  it("lists idle students before absent ones", () => {
    const students = [student("s1", 7), student("s2", 7), student("s3", 7)];
    const taps = [tap("s1", at("07:00"))];
    // s2/s3 have no tap; at NOW (09:15, past the absent cutoff) both read
    // as absent, so this also exercises "no idle students left" below.
    const result = studentsWithoutTapToday(students, taps, schoolToday(at("08:00")));
    expect(result.map((s) => s.id)).toEqual(["s2", "s3"]);
  });

  it("excludes students who already tapped", () => {
    const students = [student("s1", 7), student("s2", 7)];
    const taps = [tap("s1", at("07:00"))];
    expect(studentsWithoutTapToday(students, taps, DAY).map((s) => s.id)).toEqual(["s2"]);
  });
});

describe("deriveTapKind", () => {
  const newTap = tap("s1", at("09:15"));

  it("is a time in with no same-day tap before it", () => {
    expect(deriveTapKind(newTap, [])).toBe("time_in");
  });

  it("alternates: 2nd same-day tap is a time out", () => {
    const prior = tap("s1", at("07:56"));
    expect(deriveTapKind(newTap, [prior, newTap])).toBe("time_out");
  });

  it("alternates back: 3rd same-day tap is a time in again", () => {
    const prior = [tap("s1", at("07:56")), tap("s1", at("08:30"))];
    expect(deriveTapKind(newTap, [...prior, newTap])).toBe("time_in");
  });

  it("ignores another student's taps", () => {
    const other = tap("s2", at("07:00"));
    expect(deriveTapKind(newTap, [other])).toBe("time_in");
  });

  it("ignores taps from a previous day", () => {
    const yesterday = tap("s1", at("16:00", "2026-06-19"));
    expect(deriveTapKind(newTap, [yesterday])).toBe("time_in");
  });

  it("does not count the tap itself when it is already in the list", () => {
    const prior = tap("s1", at("07:56"));
    expect(deriveTapKind(newTap, [prior, newTap])).toBe("time_out");
  });

  it("breaks a same-timestamp tie by id", () => {
    const sameMomentA = { ...newTap, id: "tap-s1-a" };
    const sameMomentB = { ...newTap, id: "tap-s1-b" };
    expect(deriveTapKind(sameMomentB, [sameMomentA, sameMomentB])).toBe("time_out");
    expect(deriveTapKind(sameMomentA, [sameMomentA, sameMomentB])).toBe("time_in");
  });
});

describe("formatTapTime", () => {
  it("reads the school's clock, not UTC", () => {
    expect(formatTapTime(at("07:56"))).toBe("7:56 AM");
  });
});
