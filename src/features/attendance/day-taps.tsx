import { formatAttendanceDateLabel } from "./attendance-search-params";
import { DayTapsButton } from "./day-taps-button";
import type { DayTapSummary } from "./status";

/** The "N taps" button, for a day with more than a time in and a time out; nothing otherwise. */
export function DayTapsIndicator({
  summary,
  studentName,
  date,
}: {
  summary: DayTapSummary;
  studentName: string;
  date: string;
}) {
  if (summary.taps.length <= 2) return null;
  return (
    <DayTapsButton
      studentName={studentName}
      dateLabel={formatAttendanceDateLabel(date)}
      taps={summary.taps.map(({ tap, kind }) => ({ id: tap.id, tappedAt: tap.tappedAt, kind }))}
    />
  );
}
