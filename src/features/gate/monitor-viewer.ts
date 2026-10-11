import { cookies } from "next/headers";
import type { Device } from "@/features/devices/types";
import { getSession, type Session } from "@/lib/session";
import { authenticateDevice } from "@/services/devices/authenticate-device";

/** The cookie a guardhouse TV keeps once its link has connected it (Step 48). */
export const MONITOR_COOKIE = "talaan_monitor";

export type MonitorViewer = { schoolId: string; kind: "monitor" | "staff" };

/**
 * Who may watch a school's live taps: a monitor device (never a gate: a
 * gate records, a monitor watches), or a principal or super admin with a
 * school selected. Teachers don't get the live feed (owner, 2026-10-10).
 * The school always comes from who is asking, never from the address.
 */
export function monitorViewerFrom(device: Device | null, session: Session | null): MonitorViewer | null {
  if (device) return device.kind === "monitor" ? { schoolId: device.schoolId, kind: "monitor" } : null;
  if (session && session.schoolId && (session.role === "principal" || session.role === "super_admin")) {
    return { schoolId: session.schoolId, kind: "staff" };
  }
  return null;
}

/** The monitor device behind this browser's cookie, if any. */
export async function monitorDeviceFromCookie(): Promise<Device | null> {
  const token = (await cookies()).get(MONITOR_COOKIE)?.value;
  return token ? authenticateDevice(`Bearer ${token}`) : null;
}

/** The viewer behind this request: the TV's cookie first, otherwise the staff session. */
export async function resolveMonitorViewer(): Promise<MonitorViewer | null> {
  const device = await monitorDeviceFromCookie();
  return monitorViewerFrom(device, device ? null : await getSession());
}
