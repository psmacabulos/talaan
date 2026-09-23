import type { Parent } from "@/features/parents/types";
import { seedParents } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

export interface ParentRepository {
  /** A school's parent accounts. */
  listBySchool(schoolId: string): Promise<Parent[]>;
  getById(id: string): Promise<Parent | null>;
}

export function createMockParentRepository(
  data: Parent[] = seedParents,
  options: { latencyMs?: number } = {},
): ParentRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;

  return {
    async listBySchool(schoolId) {
      await simulateLatency(latencyMs);
      return data.filter((parent) => parent.schoolId === schoolId);
    },
    async getById(id) {
      await simulateLatency(latencyMs);
      return data.find((parent) => parent.id === id) ?? null;
    },
  };
}

export const parentRepository = createMockParentRepository();
