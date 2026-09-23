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

  it("finds a parent by email, case-insensitively", async () => {
    const repo = createMockParentRepository(allParents, { latencyMs: 0 });
    await expect(repo.findByEmail("MARIA@example.com")).resolves.toEqual(parentA);
  });

  it("returns null when finding an unknown email", async () => {
    const repo = createMockParentRepository(allParents, { latencyMs: 0 });
    await expect(repo.findByEmail("nope@example.com")).resolves.toBeNull();
  });

  it("creates a new parent with a password and can then find it", async () => {
    const repo = createMockParentRepository([], { latencyMs: 0 });
    const created: Parent = {
      id: "parent-c",
      schoolId: "school-a",
      firstName: "Ana",
      lastName: "Reyes",
      mobile: "09171112222",
      email: "ana@example.com",
    };
    await expect(repo.create(created, "hunter2ok")).resolves.toEqual(created);
    await expect(repo.getById("parent-c")).resolves.toEqual(created);
  });

  it("verifies a correct password", async () => {
    const repo = createMockParentRepository([], { latencyMs: 0, seedPassword: "irrelevant" });
    const created: Parent = { ...parentA, id: "parent-c", email: "ana@example.com" };
    await repo.create(created, "hunter2ok");
    await expect(repo.verifyPassword("ana@example.com", "hunter2ok")).resolves.toEqual(created);
  });

  it("rejects an incorrect password", async () => {
    const repo = createMockParentRepository([], { latencyMs: 0 });
    const created: Parent = { ...parentA, id: "parent-c", email: "ana@example.com" };
    await repo.create(created, "hunter2ok");
    await expect(repo.verifyPassword("ana@example.com", "wrong")).resolves.toBeNull();
  });

  it("rejects a password check for an unknown email", async () => {
    const repo = createMockParentRepository(allParents, { latencyMs: 0 });
    await expect(repo.verifyPassword("nope@example.com", "anything")).resolves.toBeNull();
  });
});
