import { StatusPill } from "@/components/status-pill";
import { formatTapTime, studentStatus, type SchoolDay } from "@/features/attendance/status";
import type { Tap } from "@/features/attendance/types";
import type { Student } from "@/features/students/types";
import { formatSchoolDate } from "@/lib/school-time";

/** A tap's date on the school's clock, e.g. "June 20, 2026". Exported since Step 24's notification list also groups by day. */
export const formatTapDate = formatSchoolDate;

/**
 * One linked child's card on the parent dashboard: today's status plus a
 * plain history of every tap on record for them, newest first.
 */
export function ChildSummaryCard({ student, taps, day }: { student: Student; taps: Tap[]; day: SchoolDay }) {
  const status = studentStatus(student.id, taps, day);
  const history = [...taps].sort((a, b) => Date.parse(b.tappedAt) - Date.parse(a.tappedAt));

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">
            {student.firstName} {student.lastName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Grade {student.gradeLevel} – {student.section}
          </p>
        </div>
        <StatusPill status={status} flexible={day.flexible} />
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Attendance history</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No taps on record yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {history.map((tap) => (
              <li key={tap.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{formatTapDate(tap.tappedAt)}</span>
                <span className="text-muted-foreground">{formatTapTime(tap.tappedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
