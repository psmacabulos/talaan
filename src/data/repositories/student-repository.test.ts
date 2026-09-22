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

  it("creates a new student", async () => {
    const repo = createMockStudentRepository([studentA], { latencyMs: 0 });
    const created: Student = { ...studentB };
    await expect(repo.create(created)).resolves.toEqual(created);
    await expect(repo.getById("student-b")).resolves.toEqual(created);
  });

  it("is idempotent when creating with an id that already exists", async () => {
    const repo = createMockStudentRepository([studentA], { latencyMs: 0 });
    await repo.create({ ...studentA, firstName: "Different" });
    await expect(repo.getById("student-a")).resolves.toEqual(studentA);
  });

  it("updates an existing student", async () => {
    const repo = createMockStudentRepository([studentA], { latencyMs: 0 });
    const updated: Student = { ...studentA, firstName: "Juanito" };
    await expect(repo.update(updated)).resolves.toEqual(updated);
    await expect(repo.getById("student-a")).resolves.toEqual(updated);
  });

  it("returns null when updating an unknown id", async () => {
    const repo = createMockStudentRepository([studentA], { latencyMs: 0 });
    await expect(repo.update(studentB)).resolves.toBeNull();
  });
});
