import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  parentRepository,
  parentStudentLinkRepository,
  schoolRepository,
  studentRepository,
  tapRepository,
} from "@/data/repositories";
import { DEFAULT_ATTENDANCE_TIMES, schoolToday } from "@/features/attendance/status";
import { getNow } from "@/lib/clock";
import { getParentSession } from "@/lib/parent-session";
import { ChildSummaryCard } from "@/features/parents/child-summary-card";
import type { School } from "@/features/schools/types";

export default async function ParentHomePage() {
  const session = await getParentSession();
  if (!session) redirect("/parent/login");

  const [parent, links] = await Promise.all([
    parentRepository.getById(session.parentId),
    parentStudentLinkRepository.listByParent(session.parentId),
  ]);

  // Each child is read from their own link's school (Step 53), the school
  // the server checked when they were linked, and judged by its own times.
  const schoolIds = [...new Set(links.map((link) => link.schoolId))];
  const schools = (await Promise.all(schoolIds.map((id) => schoolRepository.getById(id)))).filter(
    (school): school is School => school !== null,
  );
  const schoolById = new Map(schools.map((school) => [school.id, school]));
  const now = getNow();

  const children = (
    await Promise.all(
      links.map(async (link) => {
        const [student, taps] = await Promise.all([
          studentRepository.getInSchool(link.schoolId, link.studentId),
          tapRepository.listByStudent(link.schoolId, link.studentId),
        ]);
        if (!student) return null;
        const school = schoolById.get(link.schoolId);
        return { student, taps, school, day: schoolToday(now, school ?? DEFAULT_ATTENDANCE_TIMES) };
      }),
    )
  ).filter((child) => child !== null);
  // The school's name is only worth showing when the children are at more than one.
  const showSchoolNames = schoolIds.length > 1;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title={parent ? `Welcome, ${parent.firstName}` : "Welcome"}
        description="Your linked children."
        actions={
          <Button asChild size="sm">
            <Link href="/parent/link-child">Link a child</Link>
          </Button>
        }
      />

      {children.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No linked children yet"
          description="Link your child using their LRN, last name and birth date to see their attendance here."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {children.map(({ student, taps, school, day }) => (
            <li key={student.id}>
              <ChildSummaryCard
                student={student}
                taps={taps}
                day={day}
                schoolName={showSchoolNames ? school?.name : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
