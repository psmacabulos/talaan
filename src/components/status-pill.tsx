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

export function StatusPill({
  status,
  className,
}: {
  status: AttendanceStatus;
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
      {STATUS_LABEL[status]}
    </span>
  );
}
