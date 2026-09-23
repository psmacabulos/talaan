import { describe, expect, it } from "vitest";
import type { ParentStudentLink } from "@/features/parents/types";
import { createMockParentStudentLinkRepository } from "./parent-student-link-repository";

const link1: ParentStudentLink = {
  id: "link-1",
  schoolId: "school-a",
  parentId: "parent-a",
  studentId: "student-a",
  linkedAt: "2026-06-01T08:00:00Z",
};

const link2: ParentStudentLink = {
  id: "link-2",
  schoolId: "school-a",
  parentId: "parent-a",
  studentId: "student-b",
  linkedAt: "2026-06-01T08:00:00Z",
};

const link3: ParentStudentLink = {
  id: "link-3",
  schoolId: "school-a",
  parentId: "parent-b",
  studentId: "student-a",
  linkedAt: "2026-06-01T08:00:00Z",
};

const allLinks = [link1, link2, link3];

describe("createMockParentStudentLinkRepository", () => {
  it("lists every child of a parent", async () => {
    const repo = createMockParentStudentLinkRepository(allLinks, { latencyMs: 0 });
    await expect(repo.listByParent("parent-a")).resolves.toEqual([link1, link2]);
  });

  it("lists every guardian of a student", async () => {
    const repo = createMockParentStudentLinkRepository(allLinks, { latencyMs: 0 });
    await expect(repo.listByStudent("student-a")).resolves.toEqual([link1, link3]);
  });

  it("lists every link within a school", async () => {
    const repo = createMockParentStudentLinkRepository(allLinks, { latencyMs: 0 });
    await expect(repo.listBySchool("school-a")).resolves.toEqual([link1, link2, link3]);
  });

  it("returns an empty list for an unknown parent or student", async () => {
    const repo = createMockParentStudentLinkRepository(allLinks, { latencyMs: 0 });
    await expect(repo.listByParent("nope")).resolves.toEqual([]);
    await expect(repo.listByStudent("nope")).resolves.toEqual([]);
  });

  it("creates a new link and it shows up for both sides", async () => {
    const repo = createMockParentStudentLinkRepository([], { latencyMs: 0 });
    await expect(repo.create(link1)).resolves.toEqual(link1);
    await expect(repo.listByParent("parent-a")).resolves.toEqual([link1]);
    await expect(repo.listByStudent("student-a")).resolves.toEqual([link1]);
  });

  it("is idempotent when creating with an id that already exists", async () => {
    const repo = createMockParentStudentLinkRepository([link1], { latencyMs: 0 });
    await repo.create({ ...link1, studentId: "student-different" });
    await expect(repo.listByParent("parent-a")).resolves.toEqual([link1]);
  });
});
