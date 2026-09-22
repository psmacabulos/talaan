import { AttendanceLegend, AttendanceSegmentedBar } from "./segmented-bar";
import { SimulateTapButton } from "./simulate-tap-button";
import type { StatusCounts } from "./status";

/** The big "today" card: shared shape for both the school-wide and the class-only dashboard, just fed different counts and copy. */
export function AttendanceHero({
  eyebrow,
  subjectLabel,
  counts,
}: {
  eyebrow: string;
  /** e.g. "students are in school" / "students in your class are in school" */
  subjectLabel: string;
  counts: StatusCounts;
}) {
  const inSchool = counts.present + counts.late;
  const total = counts.present + counts.late + counts.absent + counts.idle;

  return (
    // Same padding as DashboardCard (page.tsx) on purpose: every card on the
    // dashboard then shares one inner left edge. The hero reads as the hero
    // through its type size, not through 4px of extra padding nobody can name.
    <section
      aria-labelledby="attendance-hero-heading"
      className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h3 id="attendance-hero-heading" className="text-sm font-medium text-muted-foreground">
            {eyebrow}
          </h3>
          <p className="font-heading text-4xl font-bold text-foreground sm:text-5xl">
            {inSchool}
            <span className="ml-2.5 text-base font-normal text-muted-foreground">
              of {total} {subjectLabel}
            </span>
          </p>
        </div>
        <SimulateTapButton />
      </div>
      {/* Bar and legend are one unit — the legend is the bar's key — so they
          sit closer to each other than to the headline block above. */}
      <div className="flex flex-col gap-3">
        <AttendanceSegmentedBar counts={counts} />
        <AttendanceLegend counts={counts} />
      </div>
    </section>
  );
}
