import { cn } from "@/lib/utils";

export type AttendanceStatus = "present" | "late" | "absent" | "idle";

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  idle: "Not yet tapped",
};

// Built on the fixed status tokens (src/styles/tokens.css) — never on a
// preset-themed color, since a status must mean the same thing under every
// theme a school picks.
const STATUS_CLASS: Record<AttendanceStatus, string> = {
  present: "bg-status-present-bg text-status-present",
  late: "bg-status-late-bg text-status-late",
  absent: "bg-status-absent-bg text-status-absent",
  idle: "bg-status-idle-bg text-status-idle",
};

/**
 * The words for a status. On a flexible day (a weekend, Step 44.6) only
 * present and idle can happen, and they mean "came in" and "no tap": there
 * was no time to be on time for, and nobody was expected.
 */
export function statusLabel(status: AttendanceStatus, flexible = false): string {
  if (flexible && status === "present") return "Came in";
  if (flexible && status === "idle") return "No tap";
  return STATUS_LABEL[status];
}

export function StatusPill({
  status,
  flexible = false,
  className,
}: {
  status: AttendanceStatus;
  /** The day being shown is a weekend: use the weekend words. */
  flexible?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_CLASS[status],
        className,
      )}
    >
      {statusLabel(status, flexible)}
    </span>
  );
}
