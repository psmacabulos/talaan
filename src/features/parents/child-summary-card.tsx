import { StatusPill } from "@/components/status-pill";
import { formatTapTime, studentStatus } from "@/features/attendance/status";
import type { Tap } from "@/features/attendance/types";
import type { Student } from "@/features/students/types";

/** A tap's own date, e.g. "June 20, 2026" — read as UTC fields, matching `formatTapTime` (see status.ts's comment: these timestamps represent the school's own wall-clock time written as if it were UTC). Exported since Step 24's notification list also groups by day. */
export function formatTapDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * One linked child's card on the parent dashboard: today's status plus a
 * plain history of every tap on record for them. Phase 1's seed data only
 * covers a single day (2026-06-20 — see docs/ATTENDANCE-MODEL.md's
 * `DASHBOARD_NOW`), so "history" here is honestly just that one entry for
 * now; the list is written to show more once Phase 2's real Tap API starts
 * producing taps on different days, with no change needed here.
 */
export function ChildSummaryCard({ student, taps }: { student: Student; taps: Tap[] }) {
  const status = studentStatus(student.id, taps);
  const history = [...taps].sort((a, b) => b.tappedAt.localeCompare(a.tappedAt));

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
        <StatusPill status={status} />
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Attendance history
        </h3>
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
