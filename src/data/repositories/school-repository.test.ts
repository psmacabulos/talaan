import { describe, expect, it } from "vitest";
import type { School } from "@/features/schools/types";
import { createMockSchoolRepository } from "./school-repository";

const schoolA: School = {
  id: "school-a",
  name: "School A",
  theme: { kind: "preset", presetId: "school" },
  showDepedLogo: false,
  notificationPreference: "off",
};

const schoolB: School = {
  id: "school-b",
  name: "School B",
  theme: { kind: "preset", presetId: "ocean" },
  showDepedLogo: false,
  notificationPreference: "time_in_only",
};

describe("createMockSchoolRepository", () => {
  it("lists every school", async () => {
    const repo = createMockSchoolRepository([schoolA, schoolB], { latencyMs: 0 });
    await expect(repo.list()).resolves.toEqual([schoolA, schoolB]);
  });

  it("gets a school by id", async () => {
    const repo = createMockSchoolRepository([schoolA, schoolB], { latencyMs: 0 });
    await expect(repo.getById("school-b")).resolves.toEqual(schoolB);
  });

  it("returns null for an unknown id", async () => {
    const repo = createMockSchoolRepository([schoolA], { latencyMs: 0 });
    await expect(repo.getById("nope")).resolves.toBeNull();
  });

  it("list() returns a copy, not the live array", async () => {
    const repo = createMockSchoolRepository([schoolA], { latencyMs: 0 });
    const result = await repo.list();
    result.push(schoolB);
    await expect(repo.list()).resolves.toEqual([schoolA]);
  });

  it("updates an existing school", async () => {
    const repo = createMockSchoolRepository([schoolA], { latencyMs: 0 });
    const updated: School = { ...schoolA, notificationPreference: "time_in_and_time_out" };
    await expect(repo.update(updated)).resolves.toEqual(updated);
    await expect(repo.getById("school-a")).resolves.toEqual(updated);
  });

  it("returns null when updating an unknown school", async () => {
    const repo = createMockSchoolRepository([schoolA], { latencyMs: 0 });
    await expect(repo.update(schoolB)).resolves.toBeNull();
  });

  it("create() appends a new school", async () => {
    const repo = createMockSchoolRepository([schoolA], { latencyMs: 0 });
    await expect(repo.create(schoolB)).resolves.toEqual(schoolB);
    await expect(repo.list()).resolves.toEqual([schoolA, schoolB]);
  });

  it("create() is idempotent by id", async () => {
    const repo = createMockSchoolRepository([schoolA], { latencyMs: 0 });
    const renamed: School = { ...schoolA, name: "School A Renamed" };
    await repo.create(schoolA);
    await repo.create(renamed);
    await expect(repo.list()).resolves.toEqual([schoolA]);
  });
});
