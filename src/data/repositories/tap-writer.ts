import type { Alert, Tap } from "@/features/attendance/types";
import type { Notification } from "@/features/parents/types";

/** Everything one gate tap writes (Step 45). */
export interface TapWrite {
  tap: Tap;
  /** A lost card's alert, or null. */
  alert: Alert | null;
  /** The parents' notification, or null when the school's setting sends none. */
  notification: Notification | null;
  /** The gate that sent the tap: its `lastSeenAt` becomes `seenAt` in the same write. */
  deviceId: string;
  seenAt: string;
}

/**
 * Writes a tap and what comes with it together or not at all. The tap
 * service (`src/services/taps/record-tap.ts`) decides what to write; this
 * only writes it, so every database call stays in `src/data/`.
 */
export interface TapWriter {
  /** "exists" when a tap with this id is already stored (a retry that raced the first try); nothing is written then. */
  record(write: TapWrite): Promise<"created" | "exists">;
}
