import type { BrowserContext } from "@playwright/test";

/**
 * Signs a browser in by setting the same cookies the dev role switcher
 * (src/lib/session-actions.ts) and parent login (src/lib/parent-session-actions.ts)
 * set, so a test can open any screen as any role without clicking through
 * a login form first.
 */
export const PERSONAS = {
  anonymous: null,
  super_admin: { cookie: "talaan-dev-session", value: "staff-0001" },
  principal: {
    cookie: "talaan-dev-session",
    value: "staff-principal-school-balanga",
  },
  teacher: {
    cookie: "talaan-dev-session",
    value: "staff-teacher-school-balanga",
  },
  parent: { cookie: "talaan-parent-session", value: "parent-balanga-1" },
} as const;

export type Persona = keyof typeof PERSONAS;

export async function signInAs(
  context: BrowserContext,
  persona: Persona,
  baseURL: string,
) {
  const session = PERSONAS[persona];
  if (!session) return;
  await context.addCookies([
    { name: session.cookie, value: session.value, url: baseURL },
  ]);
}

export async function previewThemePreset(
  context: BrowserContext,
  presetId: string,
  baseURL: string,
) {
  await context.addCookies([
    { name: "talaan-theme-override", value: presetId, url: baseURL },
  ]);
}
