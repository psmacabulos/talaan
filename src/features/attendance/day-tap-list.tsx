import { formatSchoolTime } from "@/lib/school-time";
import type { NotificationKind } from "@/features/parents/types";

/**
 * A day's taps in order, each labelled in or out by its place (Step 49):
 * "1. In 7:56 AM". Shared by the Attendance "N taps" dialog and a parent's
 * view of their child's day (Step 59.5), so the two read alike.
 */
export function DayTapList({ taps }: { taps: { id: string; tappedAt: string; kind: NotificationKind }[] }) {
  return (
    <ol className="flex flex-col divide-y divide-border">
      {taps.map((tap, index) => (
        <li key={tap.id} className="flex items-center justify-between gap-4 py-2.5">
          <span className="text-foreground">
            {index + 1}. {tap.kind === "time_in" ? "In" : "Out"}
          </span>
          <time dateTime={tap.tappedAt} className="text-muted-foreground tabular-nums">
            {formatSchoolTime(tap.tappedAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}
