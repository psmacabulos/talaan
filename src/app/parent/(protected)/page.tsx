import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { parentRepository, schoolRepository, studentRepository, tapRepository } from "@/data/repositories";
import { getNow } from "@/lib/clock";
import { getParentSession } from "@/lib/parent-session";
import { ChildSummaryCard } from "@/features/parents/child-summary-card";
import { parentLinks } from "@/features/parents/parent-links";
import { childrenToday } from "@/services/parents/children-today";

export default async function ParentHomePage() {
  const session = await getParentSession();
  if (!session) redirect("/parent/login");

  const parent = await parentRepository.getById(session.parentId);
  // Each child at their own link's school (Step 53), judged by its own
  // times, with today's taps and the last few, never their whole history
  // (Step 53.2).
  const children = await childrenToday(session.parentId, getNow(), {
    links: parentLinks,
    students: studentRepository,
    schools: schoolRepository,
    taps: tapRepository,
  });
  // The school's name is only worth showing when the children are at more than one.
  const showSchoolNames = new Set(children.map((child) => child.student.schoolId)).size > 1;

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
          {children.map(({ student, todayTaps, recentTaps, school, day }) => (
            <li key={student.id}>
              <ChildSummaryCard
                student={student}
                todayTaps={todayTaps}
                recentTaps={recentTaps}
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
