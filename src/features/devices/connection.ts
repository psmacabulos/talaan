import type { Device } from "./types";

/**
 * Online means seen within the last 12 minutes (Step 59.12). A gate asks
 * for its roster every 5 minutes and a monitor's feed marks it seen every
 * 5, with a 4-minute gap between writes (`SEEN_GAP_MS`), so a running
 * device is seen at least every 10 minutes: one missed check is allowed
 * before it shows as offline.
 */
export const ONLINE_WITHIN_MS = 12 * 60_000;

export type Connection = "online" | "offline" | "never";

export const CONNECTION_LABEL: Record<Connection, string> = {
  online: "Online",
  offline: "Offline",
  never: "Never connected",
};

/** From when the device was last seen and the app's clock. A time ahead of `now` counts as online. */
export function connectionStatus(lastSeenAt: string | null, now: string): Connection {
  if (!lastSeenAt) return "never";
  return Date.parse(now) - Date.parse(lastSeenAt) <= ONLINE_WITHIN_MS ? "online" : "offline";
}

/** "Just now", "2 minutes ago", "1 day ago"; null when never seen. */
export function lastSeenLabel(lastSeenAt: string | null, now: string): string | null {
  if (!lastSeenAt) return null;
  const minutes = Math.floor(Math.max(0, Date.parse(now) - Date.parse(lastSeenAt)) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return ago(minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return ago(hours, "hour");
  return ago(Math.floor(hours / 24), "day");
}

function ago(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}

export const KIND_LABEL: Record<Device["kind"], string> = {
  gate: "Gate",
  monitor: "Monitor",
};

/** The page says Enabled and Disabled; the database keeps active and revoked (Step 43). */
export const STATUS_LABEL: Record<Device["status"], string> = {
  active: "Enabled",
  revoked: "Disabled",
};
