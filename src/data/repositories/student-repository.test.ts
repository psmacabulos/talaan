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
    await expect(repo.getInSchool("school-b", "student-b")).resolves.toEqual(studentB);
  });

  it("never reaches another school's students (Step 51)", async () => {
    const students = [studentA, studentB];
    const repo = createMockStudentRepository([...students], { latencyMs: 0 });
    await expect(repo.getInSchool("school-b", "student-a")).resolves.toBeNull();
    await expect(repo.update("school-b", { ...studentA, firstName: "Changed" })).resolves.toBeNull();
    await expect(repo.getInSchool("school-a", "student-a")).resolves.toEqual(studentA);
  });

  it("keeps a student in their school on update, whatever the object says", async () => {
    const repo = createMockStudentRepository([studentA], { latencyMs: 0 });
    await expect(repo.update("school-a", { ...studentA, schoolId: "school-b" })).resolves.toMatchObject({
      schoolId: "school-a",
    });
  });

  it("returns null for an unknown id", async () => {
    const repo = createMockStudentRepository([studentA], { latencyMs: 0 });
    await expect(repo.getInSchool("school-a", "nope")).resolves.toBeNull();
  });

  it("creates a new student", async () => {
    const repo = createMockStudentRepository([studentA], { latencyMs: 0 });
    const created: Student = { ...studentB };
    await expect(repo.create(created)).resolves.toEqual(created);
    await expect(repo.getInSchool("school-b", "student-b")).resolves.toEqual(created);
  });

  it("is idempotent when creating with an id that already exists", async () => {
    const repo = createMockStudentRepository([studentA], { latencyMs: 0 });
    await repo.create({ ...studentA, firstName: "Different" });
    await expect(repo.getInSchool("school-a", "student-a")).resolves.toEqual(studentA);
  });

  it("updates an existing student", async () => {
    const repo = createMockStudentRepository([studentA], { latencyMs: 0 });
    const updated: Student = { ...studentA, firstName: "Juanito" };
    await expect(repo.update("school-a", updated)).resolves.toEqual(updated);
    await expect(repo.getInSchool("school-a", "student-a")).resolves.toEqual(updated);
  });

  it("returns null when updating an unknown id", async () => {
    const repo = createMockStudentRepository([studentA], { latencyMs: 0 });
    await expect(repo.update("school-a", studentB)).resolves.toBeNull();
  });

  it("finds a student for linking by school, LRN, last name and birth date", async () => {
    const withLrn: Student = { ...studentA, lrn: "100000000001" };
    const repo = createMockStudentRepository([withLrn, studentB], { latencyMs: 0 });
    await expect(
      repo.findForLink("school-a", { lrn: "100000000001", lastName: "dela cruz", birthDate: "2012-03-14" }),
    ).resolves.toEqual(withLrn);
  });

  it("does not find a student for linking in the wrong school", async () => {
    const withLrn: Student = { ...studentA, lrn: "100000000001" };
    const repo = createMockStudentRepository([withLrn], { latencyMs: 0 });
    await expect(
      repo.findForLink("school-b", { lrn: "100000000001", lastName: "dela cruz", birthDate: "2012-03-14" }),
    ).resolves.toBeNull();
  });

  it("does not find a student for linking with a mismatched detail", async () => {
    const withLrn: Student = { ...studentA, lrn: "100000000001" };
    const repo = createMockStudentRepository([withLrn], { latencyMs: 0 });
    await expect(
      repo.findForLink("school-a", { lrn: "100000000001", lastName: "dela cruz", birthDate: "2012-03-15" }),
    ).resolves.toBeNull();
  });
});
