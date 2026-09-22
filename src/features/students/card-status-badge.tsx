import { cn } from "@/lib/utils";
import type { CardFilterStatus } from "./card-status";

const LABEL: Record<CardFilterStatus, string> = {
  active: "Linked",
  lost: "Lost",
  none: "No card",
};

// Built on the same fixed, non-themed status tokens as StatusPill
// (src/components/status-pill.tsx) — a lost card is exactly as much of an
// alert as a student being absent, and gets the same red, in every theme.
const CLASS: Record<CardFilterStatus, string> = {
  active: "bg-status-present-bg text-status-present",
  lost: "bg-status-absent-bg text-status-absent",
  none: "bg-status-idle-bg text-status-idle",
};

export function CardStatusBadge({ status, className }: { status: CardFilterStatus; className?: string }) {
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
