import { PageHeader } from "@/components/page-header";
import { staffRepository, tapRepository } from "@/data/repositories";
import { NoSchoolSelected } from "@/features/attendance/no-school-selected";
import { getSession } from "@/lib/session";
import { parseStudentListParams } from "@/features/students/search-params";
import { searchStudents } from "@/features/students/search-students";
import { StudentsDirectory } from "@/features/students/students-directory";

export default async function StudentsPage({ searchParams }: PageProps<"/students">) {
  const session = await getSession();

  // Only a super admin can be school-less (staff schema's own rule), and
  // there's no "view school X as super admin" mechanism until Step 20 —
  // same guard the dashboard uses (src/app/(app)/dashboard/page.tsx).
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

  const params = parseStudentListParams(await searchParams);
  const { items, total } = await searchStudents(session.schoolId, params, {
    restrictTo: isTeacher
      ? { gradeLevel: signedInStaff?.advisoryGradeLevel, section: signedInStaff?.advisorySection }
      : undefined,
  });
  const taps = await tapRepository.listBySchool(session.schoolId);

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
      showGradeFilter={!isTeacher}
      canEdit={!isTeacher}
    />
  );
}
