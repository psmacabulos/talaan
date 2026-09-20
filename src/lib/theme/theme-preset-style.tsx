import { presetToCss } from "./apply-preset";
import { DEFAULT_THEME_PRESET_ID, getThemePreset } from "./presets";

/**
 * Renders the active theme preset's colors as a <style> tag, server-side,
 * before anything else paints — see apply-preset.ts for why that alone is
 * enough to avoid a flash. `presetId` is hardcoded by the caller for now
 * (there's no session yet); Steps 9/11/21 will pass a real value once one
 * exists.
 */
export function ThemePresetStyle({
  presetId = DEFAULT_THEME_PRESET_ID,
}: {
  presetId?: string;
}) {
  const preset = getThemePreset(presetId);
  return (
    <style
      id="theme-preset"
      // Raw, hardcoded CSS text (never user input) — dangerouslySetInnerHTML
      // is used so the string is set verbatim, not HTML-escaped.
      dangerouslySetInnerHTML={{ __html: presetToCss(preset) }}
    />
  );
}
