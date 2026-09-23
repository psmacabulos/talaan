import type { Student } from "@/features/students/types";
import { seedStudents } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

export interface StudentRepository {
  listBySchool(schoolId: string): Promise<Student[]>;
  getById(id: string): Promise<Student | null>;
  /** Appends a new student (Step 15's "Add student"). Idempotent by `id`, same as `TapRepository.create`. */
  create(student: Student): Promise<Student>;
  /** Replaces an existing student by `id`. Returns `null` if no student with that id exists. */
  update(student: Student): Promise<Student | null>;
  /**
   * Step 22's "link a child" lookup — the three details CLAUDE.md's domain
   * rules say a parent already has on hand (LRN, last name, birth date),
   * scoped to the school the parent chose at signup (a parent belongs to
   * exactly one school, so there's never a cross-school search). A student
   * with no LRN on file (some seed students have none — see
   * seed/students.ts's `lrnAt`) can never match here; that's an accepted
   * Phase 1 gap, not a bug.
   */
  findForLink(
    schoolId: string,
    details: { lrn: string; lastName: string; birthDate: string },
  ): Promise<Student | null>;
}

export function createMockStudentRepository(
  data: Student[] = seedStudents,
  options: { latencyMs?: number } = {},
): StudentRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;

  return {
    async listBySchool(schoolId) {
      await simulateLatency(latencyMs);
      return data.filter((student) => student.schoolId === schoolId);
    },
    async getById(id) {
      await simulateLatency(latencyMs);
      return data.find((student) => student.id === id) ?? null;
    },
    async create(student) {
      await simulateLatency(latencyMs);
      if (!data.some((existing) => existing.id === student.id)) {
        data.push(student);
      }
      return student;
    },
    async update(student) {
      await simulateLatency(latencyMs);
      const index = data.findIndex((existing) => existing.id === student.id);
      if (index === -1) return null;
      data[index] = student;
      return student;
    },
    async findForLink(schoolId, { lrn, lastName, birthDate }) {
      await simulateLatency(latencyMs);
      const normalizedLastName = lastName.trim().toLowerCase();
      return (
        data.find(
          (student) =>
            student.schoolId === schoolId &&
            student.lrn === lrn &&
            student.birthDate === birthDate &&
            student.lastName.trim().toLowerCase() === normalizedLastName,
        ) ?? null
      );
    },
  };
}

export const studentRepository = createMockStudentRepository();
