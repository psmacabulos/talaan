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
  };
}

export const studentRepository = createMockStudentRepository();
