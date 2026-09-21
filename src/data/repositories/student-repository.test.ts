import { describe, expect, it } from "vitest";
import type { Student } from "@/features/students/types";
import { createMockStudentRepository } from "./student-repository";

const studentA: Student = {
  id: "student-a",
  schoolId: "school-a",
  firstName: "Juan",
  lastName: "Dela Cruz",
  birthDate: "2012-03-14",
  gradeLevel: 8,
  section: "Rizal",
  guardianName: "Maria Dela Cruz",
  guardianMobile: "09171234567",
};

const studentB: Student = {
  ...studentA,
  id: "student-b",
  schoolId: "school-b",
  firstName: "Maria",
};

describe("createMockStudentRepository", () => {
  it("lists only a given school's students", async () => {
    const repo = createMockStudentRepository([studentA, studentB], { latencyMs: 0 });
    await expect(repo.listBySchool("school-a")).resolves.toEqual([studentA]);
  });

  it("gets a student by id", async () => {
    const repo = createMockStudentRepository([studentA, studentB], { latencyMs: 0 });
    await expect(repo.getById("student-b")).resolves.toEqual(studentB);
  });

  it("returns null for an unknown id", async () => {
    const repo = createMockStudentRepository([studentA], { latencyMs: 0 });
    await expect(repo.getById("nope")).resolves.toBeNull();
  });
});
