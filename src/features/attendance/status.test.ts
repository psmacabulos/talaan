import { describe, expect, it } from "vitest";
import type { Student } from "@/features/students/types";
import type { Tap } from "./types";
import { schoolTimeToIso } from "@/lib/school-time";
import {
  attendanceByGrade,
  countByStatus,
  dayTapSummary,
  deriveTapKind,
  formatTapTime,
  schoolDayFor,
  schoolToday,
  studentStatus,
} from "./status";

/** A time on the school's clock as a real instant: at("07:56") is 7:56 AM on the demo morning (Friday 19 June 2026) in the Philippines. */
function at(time: string, date = "2026-06-19"): string {
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

/** The day after the demo Friday. */
const SATURDAY = "2026-06-20";
const SUNDAY = "2026-06-21";

describe("weekends", () => {
  it("marks a weekend day as flexible, and a weekday as not", () => {
    expect(schoolToday(at("10:00", SATURDAY)).flexible).toBe(true);
    expect(schoolDayFor(SUNDAY, NOW).flexible).toBe(true);
    expect(DAY.flexible).toBe(false);
  });

  it("counts a Saturday tap at 10:30 AM as came in (present), not late", () => {
    const saturday = schoolToday(at("11:00", SATURDAY));
    expect(studentStatus("s1", [tap("s1", at("10:30", SATURDAY))], saturday)).toBe("present");
  });

  it("never marks a student absent on a Sunday, even late in the day or once it's over", () => {
    expect(studentStatus("s1", [], schoolToday(at("16:00", SUNDAY)))).toBe("idle");
    expect(studentStatus("s1", [], schoolDayFor(SUNDAY, at("09:00", "2026-06-22")))).toBe("idle");
  });

  it("still judges the same tap and no-tap on the Friday before", () => {
    expect(studentStatus("s1", [tap("s1", at("10:30"))], schoolToday(at("11:00")))).toBe("late");
    expect(studentStatus("s1", [], schoolToday(at("16:00")))).toBe("absent");
  });
});

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
    expect(studentStatus("s1", [tap("s1", at("07:00", "2026-06-18"))], DAY)).toBe("absent");
  });

  it("uses the earliest of two same-day taps", () => {
    const taps = [tap("s1", at("08:00")), tap("s1", at("07:00"))];
    expect(studentStatus("s1", taps, DAY)).toBe("present");
  });

  it("judges the same tap against each school's own late time", () => {
    const taps = [tap("s1", at("08:10"))];
    const graceUntil815 = schoolToday(NOW, { lateAfter: "08:15", absentFrom: "09:30" });
    expect(studentStatus("s1", taps, DAY)).toBe("late");
    expect(studentStatus("s1", taps, graceUntil815)).toBe("present");
  });

  it("judges a missing tap against each school's own absent time", () => {
    const absentFrom930 = schoolToday(NOW, { lateAfter: "08:15", absentFrom: "09:30" });
    expect(studentStatus("s1", [], DAY)).toBe("absent");
    expect(studentStatus("s1", [], absentFrom930)).toBe("idle");
  });
});

describe("school time", () => {
  it("counts a 7:50 AM tap for today, though it's the previous day in UTC", () => {
    const early = at("07:50");
    expect(early.startsWith("2026-06-18")).toBe(true);
    expect(studentStatus("s1", [tap("s1", early)], DAY)).toBe("present");
  });

  it("judges a past day as finished: no tap means absent, even at 7 AM today", () => {
    const yesterday = schoolDayFor("2026-06-18", at("07:00"));
    expect(studentStatus("s1", [], yesterday)).toBe("absent");
  });

  it("judges a future day as not started: nobody is absent yet", () => {
    const nextSchoolDay = schoolDayFor("2026-06-22", NOW);
    expect(studentStatus("s1", [], nextSchoolDay)).toBe("idle");
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

  it("never counts anyone late or absent on a weekend", () => {
    const students = [student("s1", 7), student("s2", 7), student("s3", 7)];
    const taps = [tap("s1", at("07:00", SATURDAY)), tap("s2", at("10:30", SATURDAY))];
    const saturdayEvening = schoolToday(at("18:00", SATURDAY));
    expect(countByStatus(students, taps, saturdayEvening)).toEqual({ present: 2, late: 0, absent: 0, idle: 1 });
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
    const yesterday = tap("s1", at("16:00", "2026-06-18"));
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

describe("dayTapSummary", () => {
  const summary = (taps: Tap[]) => dayTapSummary("s1", taps, DAY);

  it("has nothing for a student with no tap", () => {
    expect(summary([])).toEqual({ taps: [], timeIn: undefined, timeOut: undefined });
  });

  it("has a time in and no time out after one tap", () => {
    const first = tap("s1", at("07:50"));
    expect(summary([first])).toMatchObject({ timeIn: first, timeOut: undefined });
  });

  it("makes the second tap the time out", () => {
    const first = tap("s1", at("07:50"));
    const second = tap("s1", at("16:10"));
    expect(summary([second, first])).toMatchObject({ timeIn: first, timeOut: second });
  });

  it("shows no time out after in, out, in: the student is back in school", () => {
    const taps = [tap("s1", at("07:38")), tap("s1", at("08:20")), tap("s1", at("08:52"))];
    const result = summary(taps);
    expect(result.timeOut).toBeUndefined();
    expect(result.taps.map((entry) => entry.kind)).toEqual(["time_in", "time_out", "time_in"]);
  });

  it("makes the fourth tap the time out", () => {
    const taps = ["07:50", "12:00", "13:05", "16:10"].map((time) => tap("s1", at(time)));
    expect(summary(taps).timeOut).toBe(taps[3]);
  });

  it("ignores other students and other days", () => {
    const mine = tap("s1", at("07:50"));
    const result = summary([mine, tap("s2", at("07:40")), tap("s1", at("16:00", "2026-06-18"))]);
    expect(result.taps.map((entry) => entry.tap)).toEqual([mine]);
  });
});
