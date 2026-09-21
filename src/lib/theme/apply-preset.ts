import type { ThemeColorTokens, ThemePreset } from "./presets";

/** Anything with a resolved light/dark token pair — a named preset, or a school's custom brand-color palette (contrast.ts's CustomPalette). */
type ResolvedThemeTokens = { light: ThemeColorTokens; dark: ThemeColorTokens };

const CSS_VARIABLE_NAMES: Record<keyof ThemeColorTokens, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  link: "--link",
  highlight: "--highlight",
  highlightForeground: "--highlight-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  border: "--border",
  ring: "--ring",
};

function declarationsFor(tokens: ThemeColorTokens): string {
  return (Object.keys(tokens) as (keyof ThemeColorTokens)[])
    .map((key) => `${CSS_VARIABLE_NAMES[key]}: ${tokens[key]};`)
    .join("");
}

/**
 * `:root:root` / `.dark.dark` deliberately repeat the selector. That still
 * matches the same element (`<html>`, or `<html class="dark">`) — repeating
 * it only raises specificity to (0,2,0), which reliably beats tokens.css's
 * plain `:root` / `.dark` rules (0,1,0) no matter which <style> the browser
 * happens to parse first. No flash: unlike light/dark (a client preference
 * read from localStorage, patched in after a blocking script runs), the
 * preset id is a plain server-side value, so the server renders the final,
 * correct CSS in the first response — there's nothing to patch after paint.
 */
export function presetToCss(preset: ResolvedThemeTokens): string {
  return `:root:root{${declarationsFor(preset.light)}}.dark.dark{${declarationsFor(preset.dark)}}`;
}

/**
 * Same declarations, scoped to a selector instead of `<html>`. Used by the
 * Step 5 demo-page preview (see src/app/page.tsx) so a preset can be shown
 * without touching the real document root.
 */
export function presetToScopedCss(preset: ThemePreset, selector: string): string {
  return `${selector}{${declarationsFor(preset.light)}}.dark ${selector}{${declarationsFor(preset.dark)}}`;
}
