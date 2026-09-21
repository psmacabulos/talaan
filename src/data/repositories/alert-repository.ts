import type { Alert } from "@/features/attendance/types";
import { seedAlerts } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

export interface AlertRepository {
  listBySchool(schoolId: string): Promise<Alert[]>;
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
  };
}

export const alertRepository = createMockAlertRepository();
