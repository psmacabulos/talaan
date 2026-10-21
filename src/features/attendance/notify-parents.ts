import type { NotificationKind } from "@/features/parents/types";
import type { NotificationPreference } from "@/features/schools/types";

/**
 * The school's one setting decides which taps reach parents: `off` sends
 * nothing, `time_in_only` only arrivals, `time_in_and_time_out` both.
 * Shared by the gate's tap service (Step 45) and a time in recorded by hand
 * (Step 55), which each write the notification in the same transaction as
 * the tap, so the two can never disagree about who gets notified.
 */
export function shouldNotifyParents(preference: NotificationPreference, kind: NotificationKind): boolean {
  if (preference === "off") return false;
  return kind === "time_in" || preference === "time_in_and_time_out";
}
