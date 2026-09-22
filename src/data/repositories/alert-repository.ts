import type { Alert } from "@/features/attendance/types";
import { seedAlerts } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

export interface AlertRepository {
  listBySchool(schoolId: string): Promise<Alert[]>;
  /** Raises a new alert (Step 19's lost-card tap). Idempotent by `id`, same shape as every other repository's `create`. */
  create(alert: Alert): Promise<Alert>;
}

export function createMockAlertRepository(
  data: Alert[] = seedAlerts,
  options: { latencyMs?: number } = {},
): AlertRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;

  return {
    async listBySchool(schoolId) {
      await simulateLatency(latencyMs);
      return data.filter((alert) => alert.schoolId === schoolId);
    },
    async create(alert) {
      await simulateLatency(latencyMs);
      if (!data.some((existing) => existing.id === alert.id)) {
        data.push(alert);
      }
      return alert;
    },
  };
}

export const alertRepository = createMockAlertRepository();
