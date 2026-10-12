import { afterEach, describe, expect, it, vi } from "vitest";
import type { School } from "@/features/schools/types";
import type { Staff } from "@/features/staff/types";
import { seedSchools } from "@/data/seed";
import { SEED_STAFF_PASSWORD_HASH } from "@/data/seed/staff-password";
import { createMockSchoolRepository } from "@/data/repositories/school-repository";
import { createMockStaffRepository } from "@/data/repositories/staff-repository";
import { passwordVersion } from "./password";
import { assertDevSessionMutationAllowed, resolveSession, type SessionDeps } from "./session";
import { makeStaffSessionCookie, type StaffSessionCookie } from "./session-cookie";

const SECRET = "test-secret-0123456789-0123456789-abcdef";
const NOW = new Date("2026-10-12T08:00:00Z");
const SEED_PV = passwordVersion(SEED_STAFF_PASSWORD_HASH);

const balanga = seedSchools[0] as School;
const oceanview = seedSchools[1] as School;

const principal: Staff = {
  id: "staff-principal-balanga",
  schoolId: balanga.id,
  role: "principal",
  firstName: "Ana",
  lastName: "Reyes",
  email: "ana@talaan.example",
  status: "active",
};

const superAdmin: Staff = {
  id: "staff-super",
  schoolId: null,
  role: "super_admin",
  firstName: "Lea",
  lastName: "Cruz",
  email: "lea@talaan.example",
  status: "active",
};

function deps(): SessionDeps {
  return {
    staff: createMockStaffRepository([principal, superAdmin], { latencyMs: 0 }),
    schools: createMockSchoolRepository([balanga, oceanview], { latencyMs: 0 }),
    secret: SECRET,
    now: NOW,
  };
}

function cookieFor(contents: StaffSessionCookie, secret = SECRET, now = NOW): string {
  return makeStaffSessionCookie(contents, secret, now);
}

describe("resolveSession", () => {
  it("is signed out with no cookie", async () => {
    await expect(resolveSession(undefined, deps())).resolves.toBeNull();
  });

  it("gives the session for a valid cookie", async () => {
    const raw = cookieFor({ staffId: principal.id, pv: SEED_PV });
    await expect(resolveSession(raw, deps())).resolves.toEqual({
      userId: principal.id,
      role: "principal",
      schoolId: balanga.id,
    });
  });

  it("is signed out when the cookie was stamped with another secret", async () => {
    const raw = cookieFor({ staffId: principal.id, pv: SEED_PV }, "another-secret-0123456789-0123456789");
    await expect(resolveSession(raw, deps())).resolves.toBeNull();
  });

  it("is signed out after 30 days", async () => {
    const raw = cookieFor({ staffId: principal.id, pv: SEED_PV });
    const later = new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000 + 1000);
    await expect(resolveSession(raw, { ...deps(), now: later })).resolves.toBeNull();
  });

  it("is signed out when the staff member was removed", async () => {
    const raw = cookieFor({ staffId: "staff-removed", pv: SEED_PV });
    await expect(resolveSession(raw, deps())).resolves.toBeNull();
  });

  it("is signed out when the password changed since the cookie was made", async () => {
    const raw = cookieFor({ staffId: principal.id, pv: "an-older-password" });
    await expect(resolveSession(raw, deps())).resolves.toBeNull();
  });

  it("gives a super admin with no school opened no school", async () => {
    const raw = cookieFor({ staffId: superAdmin.id, pv: SEED_PV });
    await expect(resolveSession(raw, deps())).resolves.toEqual({
      userId: superAdmin.id,
      role: "super_admin",
      schoolId: null,
    });
  });

  it("gives a super admin the school they opened, and they stay a super admin", async () => {
    const raw = cookieFor({ staffId: superAdmin.id, pv: SEED_PV, school: oceanview.id });
    await expect(resolveSession(raw, deps())).resolves.toEqual({
      userId: superAdmin.id,
      role: "super_admin",
      schoolId: oceanview.id,
    });
  });

  it("gives a super admin no school when the opened school no longer exists", async () => {
    const raw = cookieFor({ staffId: superAdmin.id, pv: SEED_PV, school: "school-gone" });
    await expect(resolveSession(raw, deps())).resolves.toMatchObject({ schoolId: null });
  });

  it("ignores `school` for anyone but a super admin, so a principal can't view another school", async () => {
    const raw = cookieFor({ staffId: principal.id, pv: SEED_PV, school: oceanview.id });
    await expect(resolveSession(raw, deps())).resolves.toMatchObject({ schoolId: balanga.id });
  });

  it("is signed out for the old unsigned dev cookie's plain staff id", async () => {
    await expect(resolveSession(principal.id, deps())).resolves.toBeNull();
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
