import { cn } from "@/lib/utils";
import { CONNECTION_LABEL, STATUS_LABEL, type Connection } from "./connection";
import type { Device } from "./types";

// The fixed status tokens: green for on, grey for off. Never connected is
// an empty ring, so it reads differently from offline without a color.
const DOT: Record<Connection, string> = {
  online: "bg-status-present",
  offline: "bg-status-idle",
  never: "border border-muted-foreground",
};

/** A dot and a word, so the state never rests on color alone. */
export function ConnectionLabel({ connection, className }: { connection: Connection; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-foreground", className)}>
      <span className={cn("size-2 shrink-0 rounded-full", DOT[connection])} aria-hidden="true" />
      {CONNECTION_LABEL[connection]}
    </span>
  );
}

const STATUS_CLASS: Record<Device["status"], string> = {
  active: "bg-status-present-bg text-status-present",
  revoked: "bg-status-absent-bg text-status-absent",
};

export function DeviceStatusBadge({ status, className }: { status: Device["status"]; className?: string }) {
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
