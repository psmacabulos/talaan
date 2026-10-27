import { StatusPill } from "@/components/status-pill";
import { CardStatusBadge } from "@/features/students/card-status-badge";
import { StudentAvatar, studentName } from "@/features/students/student-display";
import { cn } from "@/lib/utils";
import type { AttendanceRow } from "./attendance-table";
import { DayTapsIndicator } from "./day-taps";
import { ManualTapNote } from "./manual-tap-note";
import { RecordTapButton } from "./record-tap-button";
import { dayTapSummary, formatTapTime, latestLabel, studentStatus, type SchoolDay } from "./status";
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
 *
 * On today's roll, a student with no tap yet gets "Record time in" under
 * their status, where the time will appear (Step 55); once they've tapped,
 * the time takes its place. While they're in, "Record time out" sits under
 * the times (Step 59.4).
 */
export function AttendanceCardList({
  rows,
  taps,
  day,
  label,
  variant = "cards",
  canRecordByHand = false,
}: {
  rows: AttendanceRow[];
  taps: Tap[];
  /** The day being shown, on the school's clock (src/features/attendance/status.ts). */
  day: SchoolDay;
  label: string;
  variant?: "cards" | "rows";
  /** Today's roll on the Attendance page: offer "Record time in" before any tap, and "Record time out" while a student is in. */
  canRecordByHand?: boolean;
}) {
  return (
    <ul aria-label={label} className={cn("flex flex-col", variant === "cards" ? "gap-2" : "divide-y divide-border")}>
      {rows.map(({ student, cardStatus }) => {
        const summary = dayTapSummary(student.id, taps, day);
        // With one tap the newest is the time in, already shown (Step 59.3).
        const latest = summary.taps.length > 1 ? summary.latest : undefined;
        // An odd number of taps: the student is in, so the next tap is a time out.
        const canTimeOut = canRecordByHand && summary.taps.length % 2 === 1;

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
            <StudentAvatar student={student} className="w-9" />
            <div className="min-w-0 flex-1">
              <h4 className="text-base leading-snug font-semibold wrap-break-word text-foreground">
                {studentName(student)}
              </h4>
              {cardStatus !== "active" ? <CardStatusBadge status={cardStatus} className="mt-1 px-2 py-0.5" /> : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusPill status={studentStatus(student.id, taps, day)} flexible={day.flexible} />
              {canRecordByHand && !summary.timeIn ? (
                <RecordTapButton
                  kind="time_in"
                  studentId={student.id}
                  studentName={studentName(student)}
                  layout="card"
                />
              ) : (
                <p className="text-sm text-muted-foreground tabular-nums">
                  {summary.timeIn ? (
                    <>
                      <span className="sr-only">In at </span>
                      {/* "In" is spelled out only above a latest tap; alone, the time says it. */}
                      {latest ? <span aria-hidden="true">In </span> : null}
                      <time dateTime={summary.timeIn.tappedAt}>{formatTapTime(summary.timeIn.tappedAt)}</time>
                      <ManualTapNote tap={summary.timeIn} className="block" />
                      {/* On its own line: side by side they squeezed a long name until it broke mid-word at 360px. */}
                      {latest ? (
                        <span className="block">
                          <span className="sr-only">, {latestLabel(latest.kind).toLowerCase()} at </span>
                          <span aria-hidden="true">{latestLabel(latest.kind)} </span>
                          <time dateTime={latest.tap.tappedAt}>{formatTapTime(latest.tap.tappedAt)}</time>
                          <ManualTapNote tap={latest.tap} className="block" />
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
              )}
              {canTimeOut ? (
                <RecordTapButton
                  kind="time_out"
                  studentId={student.id}
                  studentName={studentName(student)}
                  layout="card"
                />
              ) : null}
              <DayTapsIndicator summary={summary} studentName={studentName(student)} date={day.date} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
