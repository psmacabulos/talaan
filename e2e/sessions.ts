import type { BrowserContext } from "@playwright/test";
import { SEED_PARENT_PASSWORD_HASH, SEED_STAFF_PASSWORD_HASH } from "../src/data/seed/staff-password";
import { passwordVersion } from "../src/lib/password";
import {
  makeParentSessionCookie,
  makeStaffSessionCookie,
  PARENT_SESSION_COOKIE,
  SESSION_COOKIE,
} from "../src/lib/session-cookie";

/**
 * The test server's SESSION_SECRET (playwright.config.ts passes it), so the
 * tests can make signed cookies. Only ever used against the test database.
 */
export const TEST_SESSION_SECRET = "e2e-only-session-secret-not-for-real-use-0123456789";

/**
 * Signs a browser in by setting the same cookies a real sign-in sets, so a
 * test can open any screen as any role without clicking through a form.
 * Both are signed with the test secret and the seed password's
 * fingerprint, which every active seed account shares: staff (Step 50)
 * and, since Step 55.6, parents too.
 */
export const PERSONAS = {
  anonymous: null,
  super_admin: { kind: "staff", staffId: "staff-0001" },
  principal: { kind: "staff", staffId: "staff-principal-school-balanga" },
  teacher: { kind: "staff", staffId: "staff-teacher-school-balanga" },
  // The second demo school's principal, for the isolation tests (Step 51).
  oceanview_principal: { kind: "staff", staffId: "staff-principal-school-oceanview" },
  parent: { kind: "parent", parentId: "parent-balanga-1" },
} as const;

export type Persona = keyof typeof PERSONAS;

export function staffSessionCookieValue(staffId: string, school?: string): string {
  return makeStaffSessionCookie(
    { staffId, pv: passwordVersion(SEED_STAFF_PASSWORD_HASH), school },
    TEST_SESSION_SECRET,
    new Date(),
  );
}

export async function signInAs(context: BrowserContext, persona: Persona, baseURL: string) {
  const session = PERSONAS[persona];
  if (!session) return;
  const cookie =
    session.kind === "staff"
      ? { name: SESSION_COOKIE, value: staffSessionCookieValue(session.staffId) }
      : {
          name: PARENT_SESSION_COOKIE,
          value: makeParentSessionCookie(
            { parentId: session.parentId, pv: passwordVersion(SEED_PARENT_PASSWORD_HASH) },
            TEST_SESSION_SECRET,
            new Date(),
          ),
        };
  await context.addCookies([{ ...cookie, url: baseURL }]);
}

export async function previewThemePreset(context: BrowserContext, presetId: string, baseURL: string) {
  await context.addCookies([{ name: "talaan-theme-override", value: presetId, url: baseURL }]);
}
