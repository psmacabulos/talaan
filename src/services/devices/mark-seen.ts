import { deviceRepository, type DeviceRepository } from "@/data/repositories";

/**
 * At most one "seen" write per device in this gap (Step 59.12). Shorter than
 * the gate's 5-minute roster check and the monitor's 5-minute timer, so a
 * running device is written every 5 to 10 minutes: never more often.
 */
export const SEEN_GAP_MS = 4 * 60_000;

/**
 * Marks a gate or monitor as seen at `at` (the app's clock), for the
 * Devices page's Online and Offline. Never throws: a failed write must never
 * fail a gate's roster or close a monitor's feed. The log names no one.
 */
export async function markDeviceSeen(
  id: string,
  at: string,
  devices: Pick<DeviceRepository, "markSeen"> = deviceRepository,
): Promise<void> {
  try {
    await devices.markSeen(id, at, SEEN_GAP_MS);
  } catch (error) {
    console.warn("Couldn't mark a device as seen:", error instanceof Error ? error.message : error);
  }
}
