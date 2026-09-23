import type { ParentStudentLink } from "@/features/parents/types";
import { seedParentStudentLinks } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

export interface ParentStudentLinkRepository {
  /** Every link for a given parent — their linked children. */
  listByParent(parentId: string): Promise<ParentStudentLink[]>;
  /** Every link for a given student — their linked guardians. */
  listByStudent(studentId: string): Promise<ParentStudentLink[]>;
  /** Every link within a school. */
  listBySchool(schoolId: string): Promise<ParentStudentLink[]>;
  /**
   * Step 22's "link a child". Idempotent by `id`, same as the other mock
   * repositories' `create`. The caller is responsible for the "already
   * linked" duplicate check (via `listByParent`) — the same division of
   * labor `card-actions.ts` uses for its duplicate-serial check.
   */
  create(link: ParentStudentLink): Promise<ParentStudentLink>;
}

export function createMockParentStudentLinkRepository(
  data: ParentStudentLink[] = seedParentStudentLinks,
  options: { latencyMs?: number } = {},
): ParentStudentLinkRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;

  return {
    async listByParent(parentId) {
      await simulateLatency(latencyMs);
      return data.filter((link) => link.parentId === parentId);
    },
    async listByStudent(studentId) {
      await simulateLatency(latencyMs);
      return data.filter((link) => link.studentId === studentId);
    },
    async listBySchool(schoolId) {
      await simulateLatency(latencyMs);
      return data.filter((link) => link.schoolId === schoolId);
    },
    async create(link) {
      await simulateLatency(latencyMs);
      if (!data.some((existing) => existing.id === link.id)) {
        data.push(link);
      }
      return link;
    },
  };
}

export const parentStudentLinkRepository = createMockParentStudentLinkRepository();
