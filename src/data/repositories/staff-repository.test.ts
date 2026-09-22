import { describe, expect, it } from "vitest";
import type { Staff } from "@/features/staff/types";
import { createMockStaffRepository } from "./staff-repository";

const superAdmin: Staff = {
  id: "staff-super",
  schoolId: null,
  role: "super_admin",
  firstName: "Lea",
  lastName: "Cruz",
  email: "lea@talaan.example",
  status: "active",
};

const principalA: Staff = {
  id: "staff-principal-a",
  schoolId: "school-a",
  role: "principal",
  firstName: "Ana",
  lastName: "Reyes",
  email: "ana@talaan.example",
  status: "active",
};

const teacherB: Staff = {
  id: "staff-teacher-b",
  schoolId: "school-b",
  role: "teacher",
  firstName: "Mark",
  lastName: "Santos",
  email: "mark@talaan.example",
  status: "invited",
};

const allStaff = [superAdmin, principalA, teacherB];

describe("createMockStaffRepository", () => {
  it("lists only a given school's staff, excluding the global super admin", async () => {
    const repo = createMockStaffRepository(allStaff, { latencyMs: 0 });
    await expect(repo.listBySchool("school-a")).resolves.toEqual([principalA]);
  });

  it("gets a staff member by id, including the super admin", async () => {
    const repo = createMockStaffRepository(allStaff, { latencyMs: 0 });
    await expect(repo.getById("staff-super")).resolves.toEqual(superAdmin);
  });

  it("returns null for an unknown id", async () => {
    const repo = createMockStaffRepository(allStaff, { latencyMs: 0 });
    await expect(repo.getById("nope")).resolves.toBeNull();
  });

  it("lists every staff member, including the super admin", async () => {
    const repo = createMockStaffRepository(allStaff, { latencyMs: 0 });
    await expect(repo.list()).resolves.toEqual(allStaff);
  });

  it("creates a newly invited staff member", async () => {
    const repo = createMockStaffRepository([principalA], { latencyMs: 0 });
    const invited: Staff = { ...teacherB };
    await expect(repo.create(invited)).resolves.toEqual(invited);
    await expect(repo.getById("staff-teacher-b")).resolves.toEqual(invited);
  });

  it("does not overwrite an existing staff member with the same id", async () => {
    const repo = createMockStaffRepository([principalA], { latencyMs: 0 });
    await repo.create({ ...principalA, firstName: "Different" });
    await expect(repo.getById("staff-principal-a")).resolves.toEqual(principalA);
  });
});
