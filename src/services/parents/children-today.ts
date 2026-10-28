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

type ChildLink = { schoolId: string; studentId: string };

/**
 * One link's child, read the same way for the home and the child's page:
 * at the link's school, judged by that school's times. Null when the
 * student is no longer at that school. `schools` keeps each school read
 * once across a parent's children.
 */
async function readChild(
  link: ChildLink,
  now: string,
  deps: ChildrenTodayDeps,
  recentTapCount: number,
  schools: Map<string, School | null>,
): Promise<ChildToday | null> {
  const student = await deps.students.getInSchool(link.schoolId, link.studentId);
  if (!student) return null;

  if (!schools.has(link.schoolId)) schools.set(link.schoolId, await deps.schools.getById(link.schoolId));
  const school = schools.get(link.schoolId) ?? null;
  const day = schoolToday(now, school ?? DEFAULT_ATTENDANCE_TIMES);

  const todayTaps = await deps.taps.listByStudentOnDate(link.schoolId, student.id, day.date);
  const recentTaps =
    recentTapCount > 0 ? await deps.taps.listRecentByStudent(link.schoolId, student.id, recentTapCount) : [];
  return { student, school, day, todayTaps, recentTaps };
}

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
  // The parent app's `/me` and the web home (Step 59.5) show today only, so they ask for none.
  const recentTapCount = options.recentTaps ?? RECENT_TAP_COUNT;
  const links = await deps.links.listByParent(parentId);
  const schools = new Map<string, School | null>();
  const children: ChildToday[] = [];

  for (const link of links) {
    const child = await readChild(link, now, deps, recentTapCount, schools);
    if (child) children.push(child);
  }

  return children;
}

/**
 * One linked child, with today's taps and their last few, for the child's
 * own page (Step 59.5). Null when this parent has no link to them, the same
 * answer as a student who doesn't exist. The link is found first, as the
 * parent API's per-child route does, so only that one child is read.
 */
export async function childToday(
  parentId: string,
  studentId: string,
  now: string,
  deps: ChildrenTodayDeps,
): Promise<ChildToday | null> {
  const links = await deps.links.listByParent(parentId);
  const link = links.find((candidate) => candidate.studentId === studentId);
  if (!link) return null;
  return readChild(link, now, deps, RECENT_TAP_COUNT, new Map());
}
