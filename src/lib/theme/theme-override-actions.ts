"use server";

import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import type { ThemePresetId } from "./presets";
import { THEME_OVERRIDE_COOKIE } from "./theme-override";

/**
 * Sets the preview cookie. A teacher account has no theme control in the
 * UI (CLAUDE.md: principal and super admin only) — checked here too, not
 * just by which button happens to render, per Next's own Server Actions
 * security guidance (render-time gating isn't a security boundary).
 */
export async function setThemeOverride(presetId: ThemePresetId): Promise<void> {
  const session = await getSession();
  if (session.role === "teacher") {
    throw new Error("Teacher accounts can't change the theme.");
  }
  const cookieStore = await cookies();
  cookieStore.set(THEME_OVERRIDE_COOKIE, presetId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

/**
 * Clears the preview. Called right after `setDevSession` (see
 * dev-switcher.tsx) so switching persona always shows that persona's own
 * real theme, never a leftover preview from whoever was signed in before.
 */
export async function clearThemeOverride(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(THEME_OVERRIDE_COOKIE);
}
