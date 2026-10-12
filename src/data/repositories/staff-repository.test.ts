import { describe, expect, it } from "vitest";
import type { Staff } from "@/features/staff/types";
import { SEED_STAFF_PASSWORD_HASH } from "@/data/seed/staff-password";
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

  it("finds a staff member by email, whatever the case", async () => {
    const repo = createMockStaffRepository(allStaff, { latencyMs: 0 });
    await expect(repo.findByEmail(" ANA@talaan.example ")).resolves.toEqual(principalA);
    await expect(repo.findByEmail("nobody@talaan.example")).resolves.toBeNull();
  });

  it("gives an active account the demo password hash, and an invited one none", async () => {
    const repo = createMockStaffRepository(allStaff, { latencyMs: 0 });
    await expect(repo.getForSession("staff-principal-a")).resolves.toEqual({
      staff: principalA,
      passwordHash: SEED_STAFF_PASSWORD_HASH,
    });
    await expect(repo.getForSession("staff-teacher-b")).resolves.toEqual({ staff: teacherB, passwordHash: null });
    await expect(repo.getForSession("nope")).resolves.toBeNull();
  });

  it("finds an account to sign in by email, with its password hash", async () => {
    const repo = createMockStaffRepository(allStaff, { latencyMs: 0 });
    await expect(repo.findForSignIn("ANA@talaan.example")).resolves.toEqual({
      staff: principalA,
      passwordHash: SEED_STAFF_PASSWORD_HASH,
    });
    await expect(repo.findForSignIn("mark@talaan.example")).resolves.toEqual({ staff: teacherB, passwordHash: null });
    await expect(repo.findForSignIn("nobody@talaan.example")).resolves.toBeNull();
  });

  it("sets a password, making an invited account active", async () => {
    // A copy: setPassword replaces the row in the array it was given.
    const repo = createMockStaffRepository([...allStaff], { latencyMs: 0 });
    await repo.setPassword("staff-teacher-b", "scrypt:new:hash");
    await expect(repo.getForSession("staff-teacher-b")).resolves.toEqual({
      staff: { ...teacherB, status: "active" },
      passwordHash: "scrypt:new:hash",
    });
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

  it("removes a staff member", async () => {
    const repo = createMockStaffRepository([principalA, teacherB], { latencyMs: 0 });
    await repo.remove("school-b", "staff-teacher-b");
    await expect(repo.list()).resolves.toEqual([principalA]);
  });

  it("never reaches another school's staff (Step 51)", async () => {
    const repo = createMockStaffRepository([principalA, teacherB], { latencyMs: 0 });
    await expect(repo.getInSchool("school-b", "staff-principal-a")).resolves.toBeNull();
    await expect(repo.getInSchool("school-a", "staff-principal-a")).resolves.toEqual(principalA);
    await repo.remove("school-b", "staff-principal-a");
    await expect(repo.list()).resolves.toEqual([principalA, teacherB]);
  });

  it("ignores removing an unknown id", async () => {
    const repo = createMockStaffRepository([principalA], { latencyMs: 0 });
    await repo.remove("school-a", "staff-missing");
    await expect(repo.list()).resolves.toEqual([principalA]);
  });
});
