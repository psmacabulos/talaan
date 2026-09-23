import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { parentRepository, parentStudentLinkRepository, studentRepository } from "@/data/repositories";
import { getParentSession } from "@/lib/parent-session";
import type { Student } from "@/features/students/types";

/**
 * Step 22's bare-bones "your linked children" landing page — just enough
 * to prove a link persists across a sign-out and sign-in (the step's own
 * "Done when" line). Step 23 ("Parent dashboard") replaces this with each
 * child's real attendance summary and history.
 */
export default async function ParentHomePage() {
  const session = await getParentSession();
  if (!session) redirect("/parent/login");

  const [parent, links] = await Promise.all([
    parentRepository.getById(session.parentId),
    parentStudentLinkRepository.listByParent(session.parentId),
  ]);

  const students = await Promise.all(links.map((link) => studentRepository.getById(link.studentId)));
  const linkedStudents = students.filter((student): student is Student => student !== null);

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

      {linkedStudents.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No linked children yet"
          description="Link your child using their LRN, last name and birth date to see their attendance here."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {linkedStudents.map((student) => (
            <li key={student.id} className="rounded-lg border border-border bg-card p-4">
              <p className="font-heading text-base font-semibold text-foreground">
                {student.firstName} {student.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                Grade {student.gradeLevel} – {student.section}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
