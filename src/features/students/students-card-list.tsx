import { StatusPill } from "@/components/status-pill";
import { formatTapTime, studentStatus, todaysTap } from "@/features/attendance/status";
import type { Tap } from "@/features/attendance/types";
import { cn } from "@/lib/utils";
import { CardStatusBadge } from "./card-status-badge";
import type { StudentRow } from "./search-students";
import { StudentAvatar, gradeAndSection, studentName } from "./student-display";

/**
 * The students list on screens narrower than 768px (Step 27.7): one card
 * per student, with the name first, one line underneath and today's status
 * on the right, the thing a principal scans the list for.
 *
 * The line under the name is the grade and section. A teacher only ever
 * sees their own class, where that line would repeat on every card, so
 * they get today's time in instead. The card tag shows only when it's the
 * exception (no card, or lost); a linked card shows nothing. Age, LRN and
 * guardian stay in the edit drawer, since students are minors and the list
 * shows as little about them as it can.
 */
export function StudentsCardList({
  items,
  taps,
  subtitle,
  onCardClick,
}: {
  items: StudentRow[];
  taps: Tap[];
  subtitle: "grade" | "time-in";
  /** When set, each card opens that student's edit drawer; omitted for teachers, who stay read-only. */
  onCardClick?: (row: StudentRow) => void;
}) {
  return (
    <ul aria-label="Students" className="flex flex-col gap-2">
      {items.map((row) => {
        const { student, cardStatus } = row;
        const name = studentName(student);
        const tap = todaysTap(student.id, taps);

        return (
          <li
            key={student.id}
            className={cn(
              "relative flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card px-4 py-3",
              onCardClick &&
                "transition-colors hover:bg-muted/50 active:bg-muted has-focus-visible:border-ring has-focus-visible:ring-2 has-focus-visible:ring-ring/50",
            )}
          >
            <StudentAvatar student={student} className="size-10" />
            <div className="min-w-0 flex-1">
              <h3 className="text-base leading-snug font-semibold wrap-break-word text-foreground">
                {onCardClick ? (
                  // The button's invisible ::after stretches over the whole
                  // card, so a tap anywhere on it opens the drawer, while the
                  // name stays a heading for screen-reader navigation.
                  <button
                    type="button"
                    onClick={() => onCardClick(row)}
                    aria-label={`Edit ${name}`}
                    className="text-left outline-none after:absolute after:inset-0 after:rounded-lg"
                  >
                    {name}
                  </button>
                ) : (
                  name
                )}
              </h3>
              <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                {subtitle === "grade"
                  ? gradeAndSection(student)
                  : tap
                    ? `In at ${formatTapTime(tap.tappedAt)}`
                    : "No tap yet"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <StatusPill status={studentStatus(student.id, taps)} />
              {cardStatus !== "active" ? <CardStatusBadge status={cardStatus} className="px-2 py-0.5" /> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
