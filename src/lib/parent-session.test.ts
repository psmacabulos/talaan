import { describe, expect, it } from "vitest";
import type { Parent } from "@/features/parents/types";
import { createMockParentRepository } from "@/data/repositories/parent-repository";
import { resolveParentSession, type ParentSessionDeps } from "./parent-session";
import { makeParentSessionCookie, makeStaffSessionCookie } from "./session-cookie";

const SECRET = "test-secret-0123456789-0123456789-abcdef";
const NOW = new Date("2026-10-12T08:00:00Z");

const parent: Parent = {
  id: "parent-1",
  firstName: "Liza",
  lastName: "Ramos",
  mobile: "09171234567",
  email: "liza@example.com",
};

function deps(): ParentSessionDeps {
  return { parents: createMockParentRepository([parent], { latencyMs: 0 }), secret: SECRET, now: NOW };
}

describe("resolveParentSession", () => {
  it("gives the parent, and no school, for a signed cookie", async () => {
    const raw = makeParentSessionCookie(parent.id, SECRET, NOW);
    await expect(resolveParentSession(raw, deps())).resolves.toEqual({ parentId: parent.id });
  });

  it("is signed out with no cookie", async () => {
    await expect(resolveParentSession(undefined, deps())).resolves.toBeNull();
  });

  it("is signed out for a hand-typed parent id, the old unsigned cookie", async () => {
    await expect(resolveParentSession(parent.id, deps())).resolves.toBeNull();
  });

  it("is signed out for a staff session cookie, made for another purpose", async () => {
    const staffCookie = makeStaffSessionCookie({ staffId: parent.id, pv: "none" }, SECRET, NOW);
    await expect(resolveParentSession(staffCookie, deps())).resolves.toBeNull();
  });

  it("is signed out after 30 days", async () => {
    const raw = makeParentSessionCookie(parent.id, SECRET, NOW);
    const later = new Date(NOW.getTime() + 31 * 24 * 60 * 60 * 1000);
    await expect(resolveParentSession(raw, { ...deps(), now: later })).resolves.toBeNull();
  });

  it("is signed out when the parent account no longer exists", async () => {
    const raw = makeParentSessionCookie("parent-removed", SECRET, NOW);
    await expect(resolveParentSession(raw, deps())).resolves.toBeNull();
  });
});
