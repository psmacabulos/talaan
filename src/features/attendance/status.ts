import type { AttendanceStatus } from "@/components/status-pill";
import type { NotificationKind } from "@/features/parents/types";
import type { Student } from "@/features/students/types";
import { formatSchoolTime, minutesFromClockTime, schoolDateOf, schoolMinutesOf } from "@/lib/school-time";
import type { Tap } from "./types";

/** The one tap station this demo has (CLAUDE.md's domain rules don't need more than one yet). Shared by the dashboard's "Simulate a tap" and the Step 19 tap station, so a tap from either always looks like it came from the same real place. */
export const MAIN_GATE_STATION_ID = "station-main-gate";

/**
 * Late after 8:05 AM, absent from 9:00 AM: the same defaults as the `School`
 * columns in prisma/schema.prisma. Each school changes its own in Settings
 * (Step 44.5); this is only for a new school, the seed data, tests, and a
 * page whose school record somehow can't be found.
 */
export const DEFAULT_ATTENDANCE_TIMES: AttendanceTimes = { lateAfter: "08:05", absentFrom: "09:00" };

/** A school's two attendance times on its own clock, "HH:MM". */
export interface AttendanceTimes {
  lateAfter: string;
  absentFrom: string;
}

/**
 * The one day a page is about, measured on the school's clock. Every
 * status below is judged against this instead of a "now" string, so a page
 * says once which day it means and the same answer reaches every component.
 */
export interface SchoolDay {
  /** The school's calendar date being shown: "2026-06-20". */
  date: string;
  /** How far into that day it is, in minutes: a past day is over (1440), a future one hasn't started (0). */
  minutesNow: number;
  /** A tap after this is late (8:05 AM is 485). */
  lateAfter: number;
  /** With no tap by this time, a student is absent (9:00 AM is 540). */
  absentFrom: number;
}

/** The day `date` as of `now`: today is measured at the current time, a past day is over, a future one hasn't started. */
export function schoolDayFor(date: string, now: string, times: AttendanceTimes = DEFAULT_ATTENDANCE_TIMES): SchoolDay {
  const today = schoolDateOf(now);
  const minutesNow = date < today ? 24 * 60 : date > today ? 0 : schoolMinutesOf(now);
  return {
    date,
    minutesNow,
    lateAfter: minutesFromClockTime(times.lateAfter),
    absentFrom: minutesFromClockTime(times.absentFrom),
  };
}

/** Today on the school's clock, as of `now`. */
export function schoolToday(now: string, times: AttendanceTimes = DEFAULT_ATTENDANCE_TIMES): SchoolDay {
  return schoolDayFor(schoolDateOf(now), now, times);
}

/**
 * A student's earliest tap on `day` — a second same-day tap (a time out,
 * or a mis-tap) never changes whether they count as present or late.
 * Exported too, for anything that shows the actual tap (its time, its
 * station) rather than just the status it produces.
 */
export function todaysTap(studentId: string, taps: Tap[], day: SchoolDay): Tap | undefined {
  return taps
    .filter((tap) => tap.studentId === studentId && schoolDateOf(tap.tappedAt) === day.date)
    .sort((a, b) => Date.parse(a.tappedAt) - Date.parse(b.tappedAt))[0];
}

/**
 * What kind of notification a tap produces — the time-in/time-out
 * alternation decided for Phase 2 (docs/PLAN.md's "derive, don't store"
 * note), applied now: a student's taps on one day alternate, so the 1st is
 * a time in, the 2nd a time out, the 3rd a time in again, and so on. The
 * count is of taps that come strictly *before* this one (same-day, same
 * timestamp broken by id), so the result never changes whether the new tap
 * is already persisted or not. Phase 1's tap producers (the dashboard's
 * "Simulate a tap" and the station) only ever create first-of-day taps, so
 * this always returns `time_in` in the running app today — the alternation
 * is exercised by the unit tests and by Step 24's seeded `time_out`
 * notification, not by the demo buttons.
 */
export function deriveTapKind(tap: Tap, allStudentTaps: Tap[]): NotificationKind {
  const day = schoolDateOf(tap.tappedAt);
  const at = Date.parse(tap.tappedAt);
  const priorSameDay = allStudentTaps.filter(
    (other) =>
      other.studentId === tap.studentId &&
      other.id !== tap.id &&
      schoolDateOf(other.tappedAt) === day &&
      (Date.parse(other.tappedAt) < at || (Date.parse(other.tappedAt) === at && other.id < tap.id)),
  );
  return priorSameDay.length % 2 === 0 ? "time_in" : "time_out";
}

export function studentStatus(studentId: string, taps: Tap[], day: SchoolDay): AttendanceStatus {
  const tap = todaysTap(studentId, taps, day);
  if (tap) {
    return schoolMinutesOf(tap.tappedAt) <= day.lateAfter ? "present" : "late";
  }
  return day.minutesNow >= day.absentFrom ? "absent" : "idle";
}

export type StatusCounts = Record<AttendanceStatus, number>;

export function countByStatus(students: Student[], taps: Tap[], day: SchoolDay): StatusCounts {
  const counts: StatusCounts = { present: 0, late: 0, absent: 0, idle: 0 };
  for (const student of students) {
    counts[studentStatus(student.id, taps, day)]++;
  }
  return counts;
}

export type GradeAttendance = {
  gradeLevel: Student["gradeLevel"];
  studentCount: number;
  inSchoolPercent: number;
};

/** One row per grade level actually present at the school — a 3-grade demo school never shows three empty rows for grades it doesn't have. */
export function attendanceByGrade(students: Student[], taps: Tap[], day: SchoolDay): GradeAttendance[] {
  const gradeLevels = [...new Set(students.map((student) => student.gradeLevel))].sort((a, b) => a - b);

  return gradeLevels.map((gradeLevel) => {
    const inGrade = students.filter((student) => student.gradeLevel === gradeLevel);
    const counts = countByStatus(inGrade, taps, day);
    const inSchool = counts.present + counts.late;
    return {
      gradeLevel,
      studentCount: inGrade.length,
      inSchoolPercent: inGrade.length === 0 ? 0 : (inSchool / inGrade.length) * 100,
    };
  });
}

/** Students with no tap yet today, in roster order — who "Simulate a tap" picks from. Idle students are offered before absent ones, so the demo tells a "still arriving" story before it tells a "the day already ended" one. */
export function studentsWithoutTapToday(students: Student[], taps: Tap[], day: SchoolDay): Student[] {
  const idle = students.filter((student) => studentStatus(student.id, taps, day) === "idle");
  const absent = students.filter((student) => studentStatus(student.id, taps, day) === "absent");
  return [...idle, ...absent];
}

/** A tap's time of day on the school's clock, e.g. "7:56 AM". */
export const formatTapTime = formatSchoolTime;
