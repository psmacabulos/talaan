import type { AttendanceStatus } from "@/components/status-pill";
import type { NotificationKind } from "@/features/parents/types";
import type { Student } from "@/features/students/types";
import type { Tap } from "./types";

/**
 * Phase 1's fixed "right now" for the dashboard — there's no real clock to
 * read from yet (no live tap API, Phase 2), and every seed tap is dated
 * 2026-06-20 (src/data/seed/taps.ts) so today's demo has to agree with
 * that same date. 9:15 AM puts it deliberately after both cutoffs below,
 * so the seed data shows all four statuses at once (present, late, idle
 * *and* absent) instead of everyone still being "not yet tapped."
 * Simulated taps (actions.ts) are stamped with this same instant.
 */
export const DASHBOARD_NOW = "2026-06-20T09:15:00Z";

/** The one tap station this demo has (CLAUDE.md's domain rules don't need more than one yet). Shared by the dashboard's "Simulate a tap" and the Step 19 tap station, so a tap from either always looks like it came from the same real place. */
export const MAIN_GATE_STATION_ID = "station-main-gate";

/**
 * On or before this time-of-day, a tap counts as on time; after, it's late.
 * 8:00 AM start plus a five-minute grace — which is also exactly what the
 * seed data's own comments assume (src/data/seed/taps.ts calls its
 * 7:56-8:01 taps "on time" and its 8:16 one "late").
 */
export const LATE_CUTOFF_MINUTES = 8 * 60 + 5; // 8:05 AM

/** Before this time-of-day, no tap yet just means "not yet tapped"; at or after, it's absent. */
export const ABSENT_CUTOFF_MINUTES = 9 * 60; // 9:00 AM

function minutesOfDay(iso: string): number {
  const date = new Date(iso);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function isSameDate(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

/**
 * A student's earliest tap "today" (DASHBOARD_NOW's own date) — a second
 * same-day tap (e.g. a mis-tap or a future time-out tap) never changes
 * whether they're counted present/late. Exported too, for anything that
 * wants to show the actual tap (its time, its station) rather than just
 * the status it produces.
 */
export function todaysTap(studentId: string, taps: Tap[], now: string = DASHBOARD_NOW): Tap | undefined {
  return taps
    .filter((tap) => tap.studentId === studentId && isSameDate(tap.tappedAt, now))
    .sort((a, b) => a.tappedAt.localeCompare(b.tappedAt))[0];
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
  const priorSameDay = allStudentTaps.filter(
    (other) =>
      other.studentId === tap.studentId &&
      other.id !== tap.id &&
      isSameDate(other.tappedAt, tap.tappedAt) &&
      (other.tappedAt < tap.tappedAt || (other.tappedAt === tap.tappedAt && other.id < tap.id)),
  );
  return priorSameDay.length % 2 === 0 ? "time_in" : "time_out";
}

export function studentStatus(studentId: string, taps: Tap[], now: string = DASHBOARD_NOW): AttendanceStatus {
  const tap = todaysTap(studentId, taps, now);
  if (tap) {
    return minutesOfDay(tap.tappedAt) <= LATE_CUTOFF_MINUTES ? "present" : "late";
  }
  return minutesOfDay(now) >= ABSENT_CUTOFF_MINUTES ? "absent" : "idle";
}

export type StatusCounts = Record<AttendanceStatus, number>;

export function countByStatus(students: Student[], taps: Tap[], now: string = DASHBOARD_NOW): StatusCounts {
  const counts: StatusCounts = { present: 0, late: 0, absent: 0, idle: 0 };
  for (const student of students) {
    counts[studentStatus(student.id, taps, now)]++;
  }
  return counts;
}

export type GradeAttendance = {
  gradeLevel: Student["gradeLevel"];
  studentCount: number;
  inSchoolPercent: number;
};

/** One row per grade level actually present at the school — a 3-grade demo school never shows three empty rows for grades it doesn't have. */
export function attendanceByGrade(students: Student[], taps: Tap[], now: string = DASHBOARD_NOW): GradeAttendance[] {
  const gradeLevels = [...new Set(students.map((student) => student.gradeLevel))].sort((a, b) => a - b);

  return gradeLevels.map((gradeLevel) => {
    const inGrade = students.filter((student) => student.gradeLevel === gradeLevel);
    const counts = countByStatus(inGrade, taps, now);
    const inSchool = counts.present + counts.late;
    return {
      gradeLevel,
      studentCount: inGrade.length,
      inSchoolPercent: inGrade.length === 0 ? 0 : (inSchool / inGrade.length) * 100,
    };
  });
}

/** Students with no tap yet today, in roster order — who "Simulate a tap" picks from. Idle students are offered before absent ones, so the demo tells a "still arriving" story before it tells a "the day already ended" one. */
export function studentsWithoutTapToday(students: Student[], taps: Tap[], now: string = DASHBOARD_NOW): Student[] {
  const idle = students.filter((student) => studentStatus(student.id, taps, now) === "idle");
  const absent = students.filter((student) => studentStatus(student.id, taps, now) === "absent");
  return [...idle, ...absent];
}

/**
 * A tap's time of day, e.g. "7:56 AM". Reads UTC fields on purpose, not the
 * browser/server's local timezone — every stored timestamp in this app
 * represents the school's own wall-clock time written as if it were UTC
 * (matching `minutesOfDay` above), not an actual UTC instant; converting to
 * whichever timezone happens to be running the code would show the wrong
 * time to some readers.
 */
export function formatTapTime(iso: string): string {
  const date = new Date(iso);
  const hours24 = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}
