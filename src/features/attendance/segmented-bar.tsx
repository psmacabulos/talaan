import { cn } from "@/lib/utils";
import { statusLabel, type AttendanceStatus } from "@/components/status-pill";
import type { StatusCounts } from "./status";

const ORDER: AttendanceStatus[] = ["present", "late", "absent", "idle"];

/** On a weekend only these two can be non-zero, so a key never shows "Late 0, Absent 0" as if they still applied. */
const FLEXIBLE_ORDER: AttendanceStatus[] = ["present", "idle"];

function keysFor(flexible: boolean): AttendanceStatus[] {
  return flexible ? FLEXIBLE_ORDER : ORDER;
}

/**
 * The solid-fill counterpart to StatusPill's pale bg/text pair — same
 * fixed status tokens (never themed, CLAUDE.md rule 6), just used as a
 * background instead of a badge tint, for a bar segment or a legend dot
 * that needs to actually read as a color from a distance.
 */
const FILL_CLASS: Record<AttendanceStatus, string> = {
  present: "bg-status-present",
  late: "bg-status-late",
  absent: "bg-status-absent",
  idle: "bg-status-idle",
};

/** The proportional bar itself — CLAUDE.md's prototype reference calls this a "seg". */
export function AttendanceSegmentedBar({ counts, flexible = false }: { counts: StatusCounts; flexible?: boolean }) {
  const total = ORDER.reduce((sum, key) => sum + counts[key], 0);
  const ariaLabel = keysFor(flexible)
    .map((key) => `${statusLabel(key, flexible)} ${counts[key]}`)
    .join(", ");

  return (
    <div role="img" aria-label={ariaLabel} className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
      {total > 0 &&
        ORDER.filter((key) => counts[key] > 0).map((key) => (
          <div key={key} className={FILL_CLASS[key]} style={{ width: `${(counts[key] / total) * 100}%` }} />
        ))}
    </div>
  );
}

/**
 * The same four counts as boxed tiles, two by two, for the Attendance page
 * on a phone (Step 27.8, from the owner's sample screen). The number sits
 * above its label on screen, but the label comes first in the markup, so a
 * screen reader hears "Present, 5" and the list stays a valid `dl`.
 */
export function AttendanceCountTiles({ counts, flexible = false }: { counts: StatusCounts; flexible?: boolean }) {
  return (
    <dl className="grid grid-cols-2 gap-2">
      {keysFor(flexible).map((key) => (
        <div
          key={key}
          className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 rounded-lg border border-border bg-card px-4 py-3"
        >
          {/* row-end, not row-span: row-span would throw away row-start. */}
          <span
            className={cn("col-start-1 row-start-1 row-end-3 size-2.5 rounded-full", FILL_CLASS[key])}
            aria-hidden="true"
          />
          <dt className="col-start-2 row-start-2 text-sm text-muted-foreground">{statusLabel(key, flexible)}</dt>
          <dd className="col-start-2 row-start-1 font-heading text-2xl leading-tight font-semibold text-foreground">
            {counts[key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The four counts (two on a weekend) spelled out under the bar, each with its own color dot. */
export function AttendanceLegend({ counts, flexible = false }: { counts: StatusCounts; flexible?: boolean }) {
  return (
    // Two even columns on a phone, where flex-wrap would leave the second
    // item of each row starting at a different x; one row from sm up.
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap">
      {keysFor(flexible).map((key) => (
        <div key={key} className="flex items-center gap-2">
          <span className={cn("size-2.5 shrink-0 rounded-full", FILL_CLASS[key])} aria-hidden="true" />
          <dd className="font-heading text-lg font-semibold text-foreground">{counts[key]}</dd>
          <dt className="text-sm text-muted-foreground">{statusLabel(key, flexible)}</dt>
        </div>
      ))}
    </dl>
  );
}
