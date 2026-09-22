import { cn } from "@/lib/utils";
import type { StaffStatus } from "./types";

const LABEL: Record<StaffStatus, string> = {
  active: "Active",
  invited: "Invited",
};

// Same fixed, non-themed status tokens as CardStatusBadge/StatusPill — an
// invite still waiting to be accepted reads as "not yet" the same amber
// "late" uses elsewhere, not a bespoke color of its own.
const CLASS: Record<StaffStatus, string> = {
  active: "bg-status-present-bg text-status-present",
  invited: "bg-status-late-bg text-status-late",
};

export function StaffStatusBadge({ status, className }: { status: StaffStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        CLASS[status],
        className,
      )}
    >
      {LABEL[status]}
    </span>
  );
}
