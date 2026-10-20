import { AttendanceCardList } from "./attendance-card-list";
import { AttendanceTable, type AttendanceRow } from "./attendance-table";
import { AttendanceCountTiles, AttendanceLegend } from "./segmented-bar";
import type { SchoolDay, StatusCounts } from "./status";
import type { Tap } from "./types";

/**
 * One class's day on the Attendance page (Step 27.8). Below 768px: the
 * counts as boxed tiles and the students as cards under a "Students"
 * heading, laid out after the owner's sample phone screen. From 768px up:
 * the legend and table, as before. Both render and CSS shows one, so the
 * server's HTML is right for every screen from the first paint
 * (docs/RESPONSIVE-LISTS.md).
 */
export function AttendanceList({
  rows,
  taps,
  day,
  counts,
  canRecordTimeIn = false,
}: {
  rows: AttendanceRow[];
  taps: Tap[];
  day: SchoolDay;
  counts: StatusCounts;
  /** Today's roll: each student can have a time in recorded by hand (Step 55). */
  canRecordTimeIn?: boolean;
}) {
  return (
    <>
      <div className="md:hidden">
        <AttendanceCountTiles counts={counts} flexible={day.flexible} />
      </div>
      <div className="hidden md:block">
        <AttendanceLegend counts={counts} flexible={day.flexible} />
      </div>

      <section aria-labelledby="attendance-students-heading" className="flex flex-col gap-3 md:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <h3
            id="attendance-students-heading"
            className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
          >
            Students
          </h3>
          <p className="text-xs text-muted-foreground">{rows.length} total</p>
        </div>
        <AttendanceCardList rows={rows} taps={taps} day={day} label="Students" canRecordTimeIn={canRecordTimeIn} />
      </section>
      <div className="hidden md:block">
        <AttendanceTable rows={rows} taps={taps} day={day} canRecordTimeIn={canRecordTimeIn} />
      </div>
    </>
  );
}
