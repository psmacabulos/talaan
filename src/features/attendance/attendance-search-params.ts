import type { GradeLevel, Student } from "@/features/students/types";
import { DASHBOARD_NOW } from "./status";

export interface ClassOption {
  gradeLevel: GradeLevel;
  section: string;
}

export interface AttendanceListParams {
  date: string;
  gradeLevel: GradeLevel;
  section: string;
}

/**
 * The one date the seed taps actually exist on (src/data/seed/taps.ts, all
 * dated to match DASHBOARD_NOW) — also this page's default date, so opening
 * `/attendance` with no query string lands on the day that has data instead
 * of an empty page.
 */
export const ATTENDANCE_SEED_DATE = DASHBOARD_NOW.slice(0, 10);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function firstValue(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/** Falls back to the seed date on anything that isn't a plain `YYYY-MM-DD` — a missing param, a stale link, a hand-edited query string. */
export function parseAttendanceDate(raw: string | string[] | undefined): string {
  const value = firstValue(raw);
  return value && DATE_PATTERN.test(value) ? value : ATTENDANCE_SEED_DATE;
}

/**
 * Every (grade, section) pair that actually enrolls at least one student at
 * this school, sorted by grade then section name — the toolbar's own option
 * list, and the source of truth `resolveClassSelection` falls back to.
 */
export function classOptionsFromRoster(students: Student[]): ClassOption[] {
  const seen = new Set<string>();
  const options: ClassOption[] = [];
  const sorted = [...students].sort(
    (a, b) => a.gradeLevel - b.gradeLevel || a.section.localeCompare(b.section),
  );
  for (const student of sorted) {
    const key = `${student.gradeLevel}/${student.section}`;
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({ gradeLevel: student.gradeLevel, section: student.section });
  }
  return options;
}

/**
 * Resolves the requested grade/section against classes that actually exist
 * at this school, correcting a URL that names a grade/section combination
 * that doesn't — same fallback shape as the prototype's own
 * `if (!SECTIONS[grade].includes(section)) section = SECTIONS[grade][0]`.
 *
 * `lockedTo` always wins outright: a teacher's own advisory class, enforced
 * here rather than only in the toolbar, so a hand-edited URL can't show a
 * teacher a class that isn't theirs (same real server-side guard
 * `searchStudents`'s `restrictTo` already uses for the Students list).
 */
export function resolveClassSelection(
  rawGrade: string | string[] | undefined,
  rawSection: string | string[] | undefined,
  options: ClassOption[],
  lockedTo?: ClassOption,
): ClassOption | undefined {
  if (lockedTo) return lockedTo;
  if (options.length === 0) return undefined;

  const gradeValue = firstValue(rawGrade);
  const gradeNumber = gradeValue === undefined ? undefined : Number(gradeValue);
  const sectionValue = firstValue(rawSection);

  const gradeOptions = options.filter((option) => option.gradeLevel === gradeNumber);
  const resolvedGradeOptions = gradeOptions.length > 0 ? gradeOptions : [options[0]];

  return (
    resolvedGradeOptions.find((option) => option.section === sectionValue) ?? resolvedGradeOptions[0]
  );
}

export function attendanceHref(params: AttendanceListParams): string {
  const search = new URLSearchParams({
    date: params.date,
    grade: String(params.gradeLevel),
    section: params.section,
  });
  return `/attendance?${search.toString()}`;
}

/** "June 20, 2026" — for the empty state's "this demo only has data for …" message. Reads the date as a plain calendar date, not a UTC instant, same reasoning as `formatTapTime` in status.ts. */
export function formatAttendanceDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
