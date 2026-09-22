import { Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { staffRepository, tapRepository } from "@/data/repositories";
import { NoSchoolSelected } from "@/features/attendance/no-school-selected";
import { getSession } from "@/lib/session";
import { parseStudentListParams } from "@/features/students/search-params";
import { searchStudents } from "@/features/students/search-students";
import { StudentsPagination } from "@/features/students/students-pagination";
import { StudentsTable } from "@/features/students/students-table";
import { StudentsToolbar } from "@/features/students/students-toolbar";

export default async function StudentsPage({ searchParams }: PageProps<"/students">) {
  const session = await getSession();

  // Only a super admin can be school-less (staff schema's own rule), and
  // there's no "view school X as super admin" mechanism until Step 20 —
  // same guard the dashboard uses (src/app/(app)/dashboard/page.tsx).
  if (!session.schoolId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader as="h2" title="Students" description="Everyone enrolled at this school." />
        <NoSchoolSelected />
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
    <div className="flex flex-col gap-6">
      <PageHeader
        as="h2"
        title="Students"
        description={
          isTeacher
            ? signedInStaff?.advisoryGradeLevel && signedInStaff.advisorySection
              ? `Your advisory class, Grade ${signedInStaff.advisoryGradeLevel} – ${signedInStaff.advisorySection}. You can view but not edit.`
              : "You don't have an advisory class assigned yet."
            : "Everyone enrolled at this school."
        }
      />

      <StudentsToolbar params={params} showGradeFilter={!isTeacher} />

      {total === 0 ? (
        <EmptyState
          icon={Users}
          title="No students match"
          description="Try a different name, grade or card status."
        />
      ) : (
        <>
          <StudentsTable items={items} taps={taps} params={params} />
          <StudentsPagination params={params} total={total} />
        </>
      )}
    </div>
  );
}
