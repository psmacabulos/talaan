import type { Tap } from "@/features/attendance/types";
import { seedTaps } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

export interface TapRepository {
  listBySchool(schoolId: string): Promise<Tap[]>;
  listByStudent(studentId: string): Promise<Tap[]>;
  /**
   * Appends a tap (Step 13's "Simulate a tap"). Idempotent by `id`, the
   * same way a real station's tap would be (CLAUDE.md: "idempotent by a
   * device-made UUID... repeated taps... are ignored") — calling this twice
   * with the same `id` is a no-op the second time, not a duplicate.
   */
  create(tap: Tap): Promise<Tap>;
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
    async create(tap) {
      await simulateLatency(latencyMs);
      if (!data.some((existing) => existing.id === tap.id)) {
        data.push(tap);
      }
      return tap;
    },
  };
}

export const tapRepository = createMockTapRepository();
