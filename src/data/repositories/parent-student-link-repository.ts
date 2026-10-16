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
   * repositories' `create`. The caller checks "already linked" first (via
   * `listByParent`), for a friendly message; this returns `null` when the
   * parent already has a link to this student anyway (the same form sent
   * twice at once), since only one can be kept.
   */
  create(link: ParentStudentLink): Promise<ParentStudentLink | null>;
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
      const twin = data.find(
        (existing) => existing.parentId === link.parentId && existing.studentId === link.studentId,
      );
      if (twin && twin.id !== link.id) return null;
      if (!data.some((existing) => existing.id === link.id)) {
        data.push(link);
      }
      return link;
    },
  };
}
