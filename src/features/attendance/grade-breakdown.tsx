import type { GradeAttendance } from "./status";

/**
 * Every bar is the same brand color, on purpose.
 *
 * The reference prototype turned a grade's bar amber below ~92%, and the
 * first build copied that. Two problems, both visible the moment it
 * rendered against real seed data: amber is `--status-late`, which already
 * means one specific thing here ("this student arrived after the cutoff") —
 * reusing it for "this grade has absences" quietly teaches two meanings for
 * one color. And with real numbers most grades sat under the threshold, so
 * nearly every bar went amber and the card read as an alarm rather than a
 * breakdown.
 *
 * The bar's own length, plus the percentage beside it, already say which
 * grades are low — that's the at-a-glance signal. Alarm colors are left to
 * the one card on this page that's genuinely an alarm ("Needs attention").
 */
export function GradeBreakdown({ rows }: { rows: GradeAttendance[] }) {
  return (
    <div className="flex flex-col divide-y divide-border">
      {rows.map((row) => (
        <div
          key={row.gradeLevel}
          className="grid grid-cols-[5rem_1fr_3.5rem] items-center gap-4 py-3 sm:grid-cols-[7rem_1fr_3.5rem]"
        >
          <div>
            <p className="font-medium text-foreground">Grade {row.gradeLevel}</p>
            <p className="text-xs text-muted-foreground">{row.studentCount} students</p>
          </div>
          <div
            role="img"
            aria-label={`Grade ${row.gradeLevel}, ${row.inSchoolPercent.toFixed(0)} percent in school`}
            className="h-2.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${row.inSchoolPercent}%` }}
            />
          </div>
          <p className="text-right font-heading font-semibold text-foreground">
            {row.inSchoolPercent.toFixed(0)}%
          </p>
        </div>
      ))}
    </div>
  );
}
