import { cn } from "@/lib/utils";
import type { Student } from "./types";

/**
 * Display pieces shared by the desktop table and the phone cards (Step
 * 27.7), so the two views of the same student can't disagree on wording.
 */
export function studentName(student: Student): string {
  return `${student.firstName} ${student.lastName}`;
}

/** "Grade 12 – Silang". */
export function gradeAndSection(student: Student): string {
  return `Grade ${student.gradeLevel} – ${student.section}`;
}

/** Initials circle. Hidden from screen readers, since the name always sits right beside it. */
export function StudentAvatar({ student, className }: { student: Student; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground",
        className,
      )}
    >
      {`${student.firstName[0]}${student.lastName[0]}`.toUpperCase()}
    </span>
  );
}
