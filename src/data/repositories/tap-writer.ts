import type { Alert, Tap } from "@/features/attendance/types";
import type { TapNotification } from "@/features/parents/types";

/** Everything one tap writes: a gate's (Step 45), or a time in recorded by hand (Step 55). */
export interface TapWrite {
  tap: Tap;
  /** A lost card's alert, or null. */
  alert: Alert | null;
  /** The parents' notification, or null when the school's setting sends none. */
  notification: TapNotification | null;
  /** The gate that sent the tap: its `lastSeenAt` becomes `seenAt` in the same write. Null for a tap recorded by hand. */
  deviceId: string | null;
  seenAt: string;
  /**
   * The card's "already tapped" window (Step 56). When set, the card is
   * locked for the write, and a tap of the same card in this window means
   * nothing is written: two reads arriving together can't both be stored.
   * Null: no check (a tap with no card).
   */
  duplicateWindow: { from: string; to: string } | null;
}

/**
 * Writes a tap and what comes with it together or not at all. The tap
 * service (`src/services/taps/record-tap.ts`) decides what to write; this
 * only writes it, so every database call stays in `src/data/`.
 */
export interface TapWriter {
  /**
   * "exists" when a tap with this id is already stored (a retry that raced
   * the first try); "duplicate" when the same card has a tap in
   * `duplicateWindow`. Nothing is written in either case.
   */
  record(write: TapWrite): Promise<"created" | "exists" | "duplicate">;
}
