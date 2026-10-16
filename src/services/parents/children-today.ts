import type {
  ParentStudentLinkRepository,
  SchoolRepository,
  StudentRepository,
  TapRepository,
} from "@/data/repositories";
import { DEFAULT_ATTENDANCE_TIMES, schoolToday, type SchoolDay } from "@/features/attendance/status";
import type { Tap } from "@/features/attendance/types";
import type { School } from "@/features/schools/types";
import type { Student } from "@/features/students/types";

/** How many of a child's taps the parent home shows under "Recent taps" (owner decision, 2026-10-16). */
export const RECENT_TAP_COUNT = 10;

/** One linked child as the parent home shows them: today's status comes from `todayTaps`. */
export type ChildToday = {
  student: Student;
  /** The child's own school, from their link (Step 53). Null only if it was removed. */
  school: School | null;
  day: SchoolDay;
  /** Every tap of the child's school day, earliest first. */
  todayTaps: Tap[];
  /** The newest `RECENT_TAP_COUNT`, newest first, whatever the day. */
  recentTaps: Tap[];
};

export type ChildrenTodayDeps = {
  links: Pick<ParentStudentLinkRepository, "listByParent">;
  students: Pick<StudentRepository, "getInSchool">;
  schools: Pick<SchoolRepository, "getById">;
  taps: Pick<TapRepository, "listByStudentOnDate" | "listRecentByStudent">;
};

/**
 * A parent's linked children, each with today's taps and their last few
 * (`docs/SCALING.md` 2.2): two short reads per child, the same in a child's
 * sixth year as in their first, never their whole history. Each child is
 * read at their link's school and judged by that school's times. Children
 * are read one after another: a parent has a few, and the database pool is
 * shared with the gate (`docs/SCALING.md` 3.3).
 */
export async function childrenToday(
  parentId: string,
  now: string,
  deps: ChildrenTodayDeps,
  options: { recentTaps?: number } = {},
): Promise<ChildToday[]> {
  // The parent app's `/me` shows today only, so it asks for none (Step 53.3).
  const recentTapCount = options.recentTaps ?? RECENT_TAP_COUNT;
  const links = await deps.links.listByParent(parentId);
  const schools = new Map<string, School | null>();
  const children: ChildToday[] = [];

  for (const link of links) {
    const student = await deps.students.getInSchool(link.schoolId, link.studentId);
    if (!student) continue;

    if (!schools.has(link.schoolId)) schools.set(link.schoolId, await deps.schools.getById(link.schoolId));
    const school = schools.get(link.schoolId) ?? null;
    const day = schoolToday(now, school ?? DEFAULT_ATTENDANCE_TIMES);

    const todayTaps = await deps.taps.listByStudentOnDate(link.schoolId, student.id, day.date);
    const recentTaps =
      recentTapCount > 0 ? await deps.taps.listRecentByStudent(link.schoolId, student.id, recentTapCount) : [];
    children.push({ student, school, day, todayTaps, recentTaps });
  }

  return children;
}
