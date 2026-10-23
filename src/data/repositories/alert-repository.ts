import type { Alert, Tap } from "@/features/attendance/types";
import { seedAlerts, seedTaps } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

/** An open alert with the tap that raised it (the dashboard's "Needs attention"). */
export type OpenAlert = Alert & { tap: Tap };

export interface AlertRepository {
  /** The newest open alerts with their taps, and how many are open in all. */
  listOpen(schoolId: string, limit: number): Promise<{ alerts: OpenAlert[]; total: number }>;
  /** The alerts raised by these taps, for labelling a few taps on screen, and a gate's resend. */
  listForTaps(schoolId: string, tapIds: string[]): Promise<Alert[]>;
  /** Marks an alert handled. False when this school has no such alert. */
  acknowledge(schoolId: string, alertId: string): Promise<boolean>;
  // No `create`: a lost card's alert is written with its tap by `TapWriter` (Step 55.1).
}

const NEWEST_FIRST = (a: Alert, b: Alert) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);

export function createMockAlertRepository(
  data: Alert[] = seedAlerts,
  taps: Tap[] = seedTaps,
  options: { latencyMs?: number } = {},
): AlertRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;

  return {
    async listOpen(schoolId, limit) {
      await simulateLatency(latencyMs);
      const open = data.filter((alert) => alert.schoolId === schoolId && !alert.acknowledged).sort(NEWEST_FIRST);
      const alerts = open.flatMap((alert) => {
        const tap = taps.find((candidate) => candidate.id === alert.tapId);
        return tap ? [{ ...alert, tap }] : [];
      });
      return { alerts: alerts.slice(0, limit), total: open.length };
    },
    async listForTaps(schoolId, tapIds) {
      await simulateLatency(latencyMs);
      const wanted = new Set(tapIds);
      return data.filter((alert) => alert.schoolId === schoolId && wanted.has(alert.tapId));
    },
    async acknowledge(schoolId, alertId) {
      await simulateLatency(latencyMs);
      const alert = data.find((candidate) => candidate.id === alertId && candidate.schoolId === schoolId);
      if (!alert) return false;
      alert.acknowledged = true;
      return true;
    },
  };
}
