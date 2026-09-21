import { cookies } from "next/headers";
import { themePresets, type ThemePresetId } from "./presets";

/**
 * The Step 11 top-bar theme dropdown's live preview — per browser, never
 * saved to the school record (that's Step 21's job). Parallel in shape to
 * src/lib/session.ts's dev-session cookie.
 */
export const THEME_OVERRIDE_COOKIE = "talaan-theme-override";

export function isValidPresetId(value: string | undefined): value is ThemePresetId {
  return themePresets.some((preset) => preset.id === value);
}

/**
 * Reads the preview cookie, ignoring a stale or tampered value rather than
 * trusting it. The read side only — `setThemeOverride`/`clearThemeOverride`
 * live in theme-override-actions.ts instead, since a Server Function a
 * Client Component imports directly needs its own dedicated `"use server"`
 * file, and this file also exports a plain constant, which that rule
 * forbids (same reasoning as session.ts / session-actions.ts).
 */
export async function getThemeOverride(): Promise<ThemePresetId | undefined> {
  const cookieStore = await cookies();
  const value = cookieStore.get(THEME_OVERRIDE_COOKIE)?.value;
  return isValidPresetId(value) ? value : undefined;
}
