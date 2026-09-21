import type { Student } from "@/features/students/types";
import { seedStudents } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

export interface StudentRepository {
  listBySchool(schoolId: string): Promise<Student[]>;
  getById(id: string): Promise<Student | null>;
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
  };
}

export const studentRepository = createMockStudentRepository();
