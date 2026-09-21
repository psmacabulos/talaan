import type { Tap } from "@/features/attendance/types";
import { seedTaps } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

export interface TapRepository {
  listBySchool(schoolId: string): Promise<Tap[]>;
  listByStudent(studentId: string): Promise<Tap[]>;
}

export function createMockTapRepository(
  data: Tap[] = seedTaps,
  options: { latencyMs?: number } = {},
): TapRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;

  return {
    async listBySchool(schoolId) {
      await simulateLatency(latencyMs);
      return data.filter((tap) => tap.schoolId === schoolId);
    },
    async listByStudent(studentId) {
      await simulateLatency(latencyMs);
      return data.filter((tap) => tap.studentId === studentId);
    },
  };
}

export const tapRepository = createMockTapRepository();
