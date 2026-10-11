import { StatusPill } from "@/components/status-pill";
import { CardStatusBadge } from "@/features/students/card-status-badge";
import { StudentAvatar, studentName } from "@/features/students/student-display";
import { cn } from "@/lib/utils";
import type { AttendanceRow } from "./attendance-table";
import { DayTapsIndicator } from "./day-taps";
import { dayTapSummary, formatTapTime, studentStatus, type SchoolDay } from "./status";
import type { Tap } from "./types";

/**
 * One class's attendance on screens narrower than 768px (Step 27.8),
 * laid out after the owner's sample phone screen: the name on the left,
 * today's status on the right with the time in under it, so the times line
 * up in a column down the list.
 *
 * Every student here is in the same class, so there's no grade line, and
 * no LRN either: students are minors, and the list shows as little about
 * them as it can. A "No card" or "Lost" tag goes under the name only when
 * it's the exception.
 *
 * `cards` is the Attendance page's list of separate cards. `rows` is the
 * dashboard's class roll, which already sits inside a bordered panel, so
 * it uses thin dividers there instead of boxes inside a box, the same as
 * the "Live taps" list beside it.
 */
export function AttendanceCardList({
  rows,
  taps,
  day,
  label,
  variant = "cards",
}: {
  rows: AttendanceRow[];
  taps: Tap[];
  /** The day being shown, on the school's clock (src/features/attendance/status.ts). */
  day: SchoolDay;
  label: string;
  variant?: "cards" | "rows";
}) {
  return (
    <ul aria-label={label} className={cn("flex flex-col", variant === "cards" ? "gap-2" : "divide-y divide-border")}>
      {rows.map(({ student, cardStatus }) => {
        const summary = dayTapSummary(student.id, taps, day);

        return (
          <li
            key={student.id}
            className={cn(
              "flex items-center gap-3",
              variant === "cards"
                ? "min-h-16 rounded-lg border border-border bg-card px-4 py-3"
                : "py-3 first:pt-0 last:pb-0",
            )}
          >
            <StudentAvatar student={student} className="size-10" />
            <div className="min-w-0 flex-1">
              <h4 className="text-base leading-snug font-semibold wrap-break-word text-foreground">
                {studentName(student)}
              </h4>
              {cardStatus !== "active" ? <CardStatusBadge status={cardStatus} className="mt-1 px-2 py-0.5" /> : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusPill status={studentStatus(student.id, taps, day)} flexible={day.flexible} />
              <p className="text-sm text-muted-foreground tabular-nums">
                {summary.timeIn ? (
                  <>
                    <span className="sr-only">In at </span>
                    {/* "In" is spelled out only beside an "Out"; alone, the time says it. */}
                    {summary.timeOut ? <span aria-hidden="true">In </span> : null}
                    <time dateTime={summary.timeIn.tappedAt}>{formatTapTime(summary.timeIn.tappedAt)}</time>
                    {/* On its own line: side by side they squeezed a long name until it broke mid-word at 360px. */}
                    {summary.timeOut ? (
                      <span className="block">
                        <span className="sr-only">, out at </span>
                        <span aria-hidden="true">Out </span>
                        <time dateTime={summary.timeOut.tappedAt}>{formatTapTime(summary.timeOut.tappedAt)}</time>
                      </span>
                    ) : null}
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">—</span>
                    <span className="sr-only">No tap yet</span>
                  </>
                )}
              </p>
              <DayTapsIndicator summary={summary} studentName={studentName(student)} date={day.date} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
