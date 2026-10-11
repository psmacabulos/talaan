import { cn } from "@/lib/utils";
import { photoPath } from "./photo";
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

/**
 * The student's photo (Step 46.5), or their initials in a circle when there
 * isn't one. Hidden from screen readers, since the name always sits right
 * beside it. A plain <img>, not next/image: the photo route checks who is
 * asking, and the image optimizer would fetch it without the viewer's
 * cookie. The thumbnail is already small, so there's nothing to optimise.
 */
export function StudentAvatar({
  student,
  className,
  photoSrc,
}: {
  student: Pick<Student, "firstName" | "lastName" | "photoKey">;
  className?: string;
  /** Overrides where the photo comes from: the gate shows it from its own cache. */
  photoSrc?: string | null;
}) {
  const src = photoSrc !== undefined ? photoSrc : student.photoKey ? photoPath(student.photoKey) : null;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- see above: the optimizer can't carry the viewer's access
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        width={256}
        height={256}
        className={cn("size-9 shrink-0 rounded-full bg-accent object-cover", className)}
      />
    );
  }
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
