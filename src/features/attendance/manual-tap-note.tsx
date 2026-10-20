import { cn } from "@/lib/utils";
import type { Tap } from "./types";

/**
 * "Recorded by staff" under a time in that a staff member recorded by hand
 * (Step 55), so a time that came from a button, not a card, never looks
 * like a gate read. Nothing for a card's tap.
 */
export function ManualTapNote({ tap, className }: { tap: Tap; className?: string }) {
  if (tap.source !== "manual") return null;
  return <span className={cn("text-xs text-muted-foreground", className)}>Recorded by staff</span>;
}
