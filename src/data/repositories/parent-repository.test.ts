import { describe, expect, it } from "vitest";
import type { Parent } from "@/features/parents/types";
import { createMockParentRepository } from "./parent-repository";

const parentA: Parent = {
  id: "parent-a",
  schoolId: "school-a",
  firstName: "Maria",
  lastName: "Dela Cruz",
  mobile: "09171234567",
  email: "maria@example.com",
};

const parentB: Parent = {
  id: "parent-b",
  schoolId: "school-b",
  firstName: "Jose",
  lastName: "Santos",
  mobile: "09179876543",
  email: "jose@example.com",
};

const allParents = [parentA, parentB];

describe("createMockParentRepository", () => {
  it("lists only a given school's parents", async () => {
    const repo = createMockParentRepository(allParents, { latencyMs: 0 });
    await expect(repo.listBySchool("school-a")).resolves.toEqual([parentA]);
  });

  it("gets a parent by id", async () => {
    const repo = createMockParentRepository(allParents, { latencyMs: 0 });
    await expect(repo.getById("parent-b")).resolves.toEqual(parentB);
  });

  it("returns null for an unknown id", async () => {
    const repo = createMockParentRepository(allParents, { latencyMs: 0 });
    await expect(repo.getById("nope")).resolves.toBeNull();
  });
});
