import type { School } from "@/features/schools/types";
import { seedSchools } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

/**
 * What Phase 2's real database-backed implementation will also satisfy —
 * nothing outside src/data/ ever imports seedSchools directly (CLAUDE.md:
 * "Data access goes only through repository interfaces").
 */
export interface SchoolRepository {
  /** Every school (super admins need the cross-school view). */
  list(): Promise<School[]>;
  getById(id: string): Promise<School | null>;
  /** Replaces an existing school by `id` (Step 21's notification settings, and Step 26's appearance settings). Returns `null` if no school with that id exists. */
  update(school: School): Promise<School | null>;
}

export function createMockSchoolRepository(
  data: School[] = seedSchools,
  options: { latencyMs?: number } = {},
): SchoolRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;

  return {
    async list() {
      await simulateLatency(latencyMs);
      return [...data];
    },
    async getById(id) {
      await simulateLatency(latencyMs);
      return data.find((school) => school.id === id) ?? null;
    },
    async update(school) {
      await simulateLatency(latencyMs);
      const index = data.findIndex((existing) => existing.id === school.id);
      if (index === -1) return null;
      data[index] = school;
      return school;
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const schoolRepository = createMockSchoolRepository();
