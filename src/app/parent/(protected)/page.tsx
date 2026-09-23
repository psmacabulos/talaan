import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  parentRepository,
  parentStudentLinkRepository,
  studentRepository,
  tapRepository,
} from "@/data/repositories";
import { getParentSession } from "@/lib/parent-session";
import { ChildSummaryCard } from "@/features/parents/child-summary-card";
import type { Student } from "@/features/students/types";

export default async function ParentHomePage() {
  const session = await getParentSession();
  if (!session) redirect("/parent/login");

  const [parent, links] = await Promise.all([
    parentRepository.getById(session.parentId),
    parentStudentLinkRepository.listByParent(session.parentId),
  ]);

  const students = await Promise.all(links.map((link) => studentRepository.getById(link.studentId)));
  const linkedStudents = students.filter((student): student is Student => student !== null);
  const tapsByStudent = await Promise.all(
    linkedStudents.map((student) => tapRepository.listByStudent(student.id)),
  );

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
          {linkedStudents.map((student, index) => (
            <li key={student.id}>
              <ChildSummaryCard student={student} taps={tapsByStudent[index]} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
