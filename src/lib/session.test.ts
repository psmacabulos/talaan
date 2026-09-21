import { afterEach, describe, expect, it, vi } from "vitest";
import type { Staff } from "@/features/staff/types";
import { createMockStaffRepository } from "@/data/repositories/staff-repository";
import { assertDevSessionMutationAllowed, resolveSession } from "./session";

const principal: Staff = {
  id: "staff-principal-school-balanga",
  schoolId: "school-balanga",
  role: "principal",
  firstName: "Ana",
  lastName: "Reyes",
  email: "ana@talaan.example",
  status: "active",
};

const teacher: Staff = {
  id: "staff-teacher-school-balanga",
  schoolId: "school-balanga",
  role: "teacher",
  firstName: "Mark",
  lastName: "Santos",
  email: "mark@talaan.example",
  status: "active",
};

describe("resolveSession", () => {
  it("resolves the session from a staff id in the cookie", async () => {
    const repo = createMockStaffRepository([principal, teacher], { latencyMs: 0 });
    await expect(resolveSession("staff-teacher-school-balanga", repo)).resolves.toEqual({
      userId: "staff-teacher-school-balanga",
      role: "teacher",
      schoolId: "school-balanga",
    });
  });

  it("falls back to the default persona when no cookie value is given", async () => {
    const repo = createMockStaffRepository([principal, teacher], { latencyMs: 0 });
    await expect(resolveSession(undefined, repo)).resolves.toEqual({
      userId: "staff-principal-school-balanga",
      role: "principal",
      schoolId: "school-balanga",
    });
  });

  it("falls back to the default persona when the cookie references a staff id that no longer exists", async () => {
    const repo = createMockStaffRepository([principal, teacher], { latencyMs: 0 });
    await expect(resolveSession("staff-does-not-exist", repo)).resolves.toEqual({
      userId: "staff-principal-school-balanga",
      role: "principal",
      schoolId: "school-balanga",
    });
  });

  it("carries a null schoolId through for a super admin", async () => {
    const superAdmin: Staff = { ...principal, id: "staff-super", role: "super_admin", schoolId: null };
    const repo = createMockStaffRepository([superAdmin], { latencyMs: 0 });
    await expect(resolveSession("staff-super", repo)).resolves.toEqual({
      userId: "staff-super",
      role: "super_admin",
      schoolId: null,
    });
  });

  it("throws if even the default persona is missing from the data", async () => {
    const repo = createMockStaffRepository([teacher], { latencyMs: 0 });
    await expect(resolveSession(undefined, repo)).rejects.toThrow(/not found/);
  });
});

describe("assertDevSessionMutationAllowed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not throw outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(() => assertDevSessionMutationAllowed()).not.toThrow();
  });

  it("throws in production — this is what makes the dev switcher impossible to enable there", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => assertDevSessionMutationAllowed()).toThrow();
  });
});
