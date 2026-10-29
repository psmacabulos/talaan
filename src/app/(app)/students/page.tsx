import { PageHeader } from "@/components/page-header";
import { parentStudentLinkRepository, schoolRepository, staffRepository, tapRepository } from "@/data/repositories";
import { NoSchoolSelected } from "@/features/attendance/no-school-selected";
import { DEFAULT_ATTENDANCE_TIMES, schoolToday } from "@/features/attendance/status";
import { getNow } from "@/lib/clock";
import { requireSession } from "@/lib/session";
import { parseStudentListParams } from "@/features/students/search-params";
import { searchStudents, type StudentRow } from "@/features/students/search-students";
import type { LinkedGuardian, RemovedGuardian } from "@/features/parents/types";
import { StudentsDirectory } from "@/features/students/students-directory";

/** Rows grouped by their student's id, each group in the order given. */
function byStudent<T extends { studentId: string }>(rows: T[]): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  for (const row of rows) (grouped[row.studentId] ??= []).push(row);
  return grouped;
}

/**
 * The parent accounts linked to the students on this page (Step 55.3), and
 * the ones the school removed (Step 55.4), by student id: one query each
 * for all of them. Only for staff who can open the drawer: a parent's
 * mobile number is for the people who'd act on it.
 */
async function parentAccountsOf(
  schoolId: string,
  rows: StudentRow[],
): Promise<{ guardians: Record<string, LinkedGuardian[]>; removed: Record<string, RemovedGuardian[]> }> {
  const studentIds = rows.map((row) => row.student.id);
  const [guardians, removed] = await Promise.all([
    parentStudentLinkRepository.listGuardiansInSchool(schoolId, studentIds),
    parentStudentLinkRepository.listBlocksInSchool(schoolId, studentIds),
  ]);
  return { guardians: byStudent(guardians), removed: byStudent(removed) };
}

export default async function StudentsPage({ searchParams }: PageProps<"/students">) {
  const session = await requireSession();

  // Only a super admin can have no school: until they open one on the
  // Schools page (Step 50), there's no school to show.
  if (!session.schoolId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Students" description="Everyone enrolled at this school." />
        <NoSchoolSelected subject="student list" />
      </div>
    );
  }

  const isTeacher = session.role === "teacher";
  const signedInStaff = isTeacher ? await staffRepository.getById(session.userId) : null;

  // Each student's status pill and age are as of today on the school's clock.
  const school = await schoolRepository.getById(session.schoolId);
  const day = schoolToday(getNow(), school ?? DEFAULT_ATTENDANCE_TIMES);

  const params = parseStudentListParams(await searchParams);
  const { items, total } = await searchStudents(session.schoolId, params, {
    today: day.date,
    restrictTo: isTeacher
      ? { gradeLevel: signedInStaff?.advisoryGradeLevel, section: signedInStaff?.advisorySection }
      : undefined,
  });
  const taps = await tapRepository.listBySchoolOnDate(session.schoolId, day.date);
  const parentAccounts = isTeacher ? { guardians: {}, removed: {} } : await parentAccountsOf(session.schoolId, items);

  return (
    <StudentsDirectory
      title="Students"
      description={
        isTeacher
          ? signedInStaff?.advisoryGradeLevel && signedInStaff.advisorySection
            ? `Your advisory class, Grade ${signedInStaff.advisoryGradeLevel} – ${signedInStaff.advisorySection}. You can view but not edit.`
            : "You don't have an advisory class assigned yet."
          : "Everyone enrolled at this school."
      }
      params={params}
      items={items}
      total={total}
      taps={taps}
      day={day}
      showGradeFilter={!isTeacher}
      canEdit={!isTeacher}
      guardiansByStudent={parentAccounts.guardians}
      removedByStudent={parentAccounts.removed}
    />
  );
}
