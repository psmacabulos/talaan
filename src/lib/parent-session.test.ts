import { describe, expect, it } from "vitest";
import type { Parent } from "@/features/parents/types";
import { createMockParentRepository, SEED_PARENT_PASSWORD } from "@/data/repositories/parent-repository";
import { resolveParentSession, type ParentSessionDeps } from "./parent-session";
import { passwordVersion } from "./password";
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

/** The mock repository's stand-in hash for the seed password (parent-repository.ts). */
const PV = passwordVersion(`mock:${SEED_PARENT_PASSWORD}`);

function deps(): ParentSessionDeps {
  return { parents: createMockParentRepository([parent], { latencyMs: 0 }), secret: SECRET, now: NOW };
}

describe("resolveParentSession", () => {
  it("gives the parent, and no school, for a signed cookie", async () => {
    const raw = makeParentSessionCookie({ parentId: parent.id, pv: PV }, SECRET, NOW);
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
    const raw = makeParentSessionCookie({ parentId: parent.id, pv: PV }, SECRET, NOW);
    const later = new Date(NOW.getTime() + 31 * 24 * 60 * 60 * 1000);
    await expect(resolveParentSession(raw, { ...deps(), now: later })).resolves.toBeNull();
  });

  it("is signed out when the parent account no longer exists", async () => {
    const raw = makeParentSessionCookie({ parentId: "parent-removed", pv: PV }, SECRET, NOW);
    await expect(resolveParentSession(raw, deps())).resolves.toBeNull();
  });

  it("is signed out once the password has changed since the cookie was made (Step 55.6)", async () => {
    const raw = makeParentSessionCookie(
      { parentId: parent.id, pv: passwordVersion("mock:an-older-password") },
      SECRET,
      NOW,
    );
    await expect(resolveParentSession(raw, deps())).resolves.toBeNull();
  });
});
