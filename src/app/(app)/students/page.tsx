import { PageHeader } from "@/components/page-header";
import { schoolRepository, staffRepository, tapRepository } from "@/data/repositories";
import { NoSchoolSelected } from "@/features/attendance/no-school-selected";
import { DEFAULT_ATTENDANCE_TIMES, schoolToday } from "@/features/attendance/status";
import { getNow } from "@/lib/clock";
import { requireSession } from "@/lib/session";
import { parseStudentListParams } from "@/features/students/search-params";
import { searchStudents } from "@/features/students/search-students";
import { StudentsDirectory } from "@/features/students/students-directory";

export default async function StudentsPage({ searchParams }: PageProps<"/students">) {
  const session = await requireSession();

  // Only a super admin can have no school: until they open one on the
  // Schools page (Step 50), there's no school to show.
  if (!session.schoolId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader as="h2" title="Students" description="Everyone enrolled at this school." />
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
    />
  );
}
