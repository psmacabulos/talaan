import type { School, SchoolTheme } from "@/features/schools/types";
import { generateCustomPalette } from "./contrast";
import { DEFAULT_THEME_PRESET_ID, getThemePreset, type ThemeColorTokens, type ThemePresetId } from "./presets";

export type ResolvedTheme = { light: ThemeColorTokens; dark: ThemeColorTokens };

/** A school's own theme, resolved to real color values either way — a named preset, or (Step 5's generateCustomPalette) a full palette derived from one brand color. */
export function resolveSchoolTheme(theme: SchoolTheme): ResolvedTheme {
  if (theme.kind === "custom") {
    return generateCustomPalette(theme.brandColor);
  }
  const preset = getThemePreset(theme.presetId);
  return { light: preset.light, dark: preset.dark };
}

/**
 * What should actually be on screen right now: the Step 11 top-bar theme
 * dropdown's live preview wins if one is set, otherwise the signed-in
 * school's own saved theme, otherwise (a super admin with no school in
 * view) the app's default preset.
 */
export function resolveActiveTheme(school: School | null, overridePresetId?: ThemePresetId): ResolvedTheme {
  if (overridePresetId) {
    const preset = getThemePreset(overridePresetId);
    return { light: preset.light, dark: preset.dark };
  }
  if (school) {
    return resolveSchoolTheme(school.theme);
  }
  return resolveSchoolTheme({ kind: "preset", presetId: DEFAULT_THEME_PRESET_ID });
}
