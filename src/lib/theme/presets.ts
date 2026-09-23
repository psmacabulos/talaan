/*
 * Theme presets: the swappable color half of the design system. Radius,
 * shadow, motion and the fixed status colors live only in
 * src/styles/tokens.css and are never touched by a preset — see CLAUDE.md's
 * design-system rules for why. A preset only ever changes color.
 *
 * `school` is copied byte-for-byte from tokens.css's current `:root`/`.dark`
 * values (kept in sync by src/lib/theme/presets.test.ts), so picking it is
 * a no-op compared to today's app. The other four presets are proposed
 * brand palettes, calibrated with the same OKLCH lightness/chroma shape as
 * `school`; oklchToken() gamut-clamps every one of them so what a browser
 * actually renders always matches what the AA contrast tests check.
 */

import { toOklchString } from "./oklch";

export type ThemeColorTokens = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  link: string;
  highlight: string;
  highlightForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  ring: string;
};

export type ThemePresetId = "school" | "ocean" | "emerald" | "crimson" | "violet";

export type ThemePreset = {
  id: ThemePresetId;
  name: string;
  light: ThemeColorTokens;
  dark: ThemeColorTokens;
};

function oklchToken(l: number, c: number, h: number): string {
  return toOklchString(l / 100, c, h);
}

// The universal "flagged" accent — identical across every preset in both
// modes, the same way the fixed status colors are. See docs/PLAN.md Step 5.
const HIGHLIGHT = "oklch(90.6% 0.184 102)";
const HIGHLIGHT_FOREGROUND = "oklch(25.2% 0.061 262.8)";

const schoolPreset: ThemePreset = {
  id: "school",
  name: "School",
  light: {
    background: "oklch(97.5% 0.006 255.5)",
    foreground: "oklch(25.2% 0.061 262.8)",
    card: "oklch(100% 0 0)",
    cardForeground: "oklch(25.2% 0.061 262.8)",
    primary: "oklch(32.5% 0.087 268.9)",
    primaryForeground: "oklch(100% 0 0)",
    link: "oklch(54% 0.108 236.8)",
    highlight: HIGHLIGHT,
    highlightForeground: HIGHLIGHT_FOREGROUND,
    muted: "oklch(94.7% 0.013 255.5)",
    mutedForeground: "oklch(52.4% 0.044 259.2)",
    accent: "oklch(95.9% 0.01 228.9)",
    accentForeground: "oklch(25.2% 0.061 262.8)",
    border: "oklch(92.3% 0.016 257.2)",
    ring: "oklch(32.5% 0.087 268.9)",
  },
  dark: {
    background: "oklch(19.8% 0.037 264.2)",
    foreground: "oklch(95.1% 0.016 262.8)",
    card: "oklch(24.2% 0.047 263.9)",
    cardForeground: "oklch(95.1% 0.016 262.8)",
    primary: "oklch(67.5% 0.081 231.4)",
    primaryForeground: "oklch(17.7% 0.032 258.7)",
    link: "oklch(74.4% 0.065 231.4)",
    highlight: HIGHLIGHT,
    highlightForeground: HIGHLIGHT_FOREGROUND,
    muted: "oklch(29.1% 0.051 263.3)",
    mutedForeground: "oklch(73.8% 0.043 260.9)",
    accent: "oklch(29.2% 0.058 252.8)",
    accentForeground: "oklch(95.1% 0.016 262.8)",
    border: "oklch(32% 0.057 264.4)",
    ring: "oklch(67.5% 0.081 231.4)",
  },
};

const oceanPreset: ThemePreset = {
  id: "ocean",
  name: "Ocean",
  light: {
    background: oklchToken(97.5, 0.008, 224),
    foreground: oklchToken(25.5, 0.05, 222),
    card: "oklch(100% 0 0)",
    cardForeground: oklchToken(25.5, 0.05, 222),
    primary: oklchToken(33, 0.09, 224),
    primaryForeground: "oklch(100% 0 0)",
    link: oklchToken(52, 0.11, 205),
    highlight: HIGHLIGHT,
    highlightForeground: HIGHLIGHT_FOREGROUND,
    muted: oklchToken(94.5, 0.015, 222),
    mutedForeground: oklchToken(51, 0.04, 220),
    accent: oklchToken(95.5, 0.02, 200),
    accentForeground: oklchToken(25.5, 0.05, 222),
    border: oklchToken(92, 0.018, 220),
    ring: oklchToken(33, 0.09, 224),
  },
  dark: {
    background: oklchToken(19.5, 0.03, 226),
    foreground: oklchToken(95, 0.015, 222),
    card: oklchToken(24, 0.04, 225),
    cardForeground: oklchToken(95, 0.015, 222),
    primary: oklchToken(70, 0.1, 205),
    primaryForeground: oklchToken(17, 0.03, 220),
    link: oklchToken(76, 0.08, 205),
    highlight: HIGHLIGHT,
    highlightForeground: HIGHLIGHT_FOREGROUND,
    muted: oklchToken(28.5, 0.045, 224),
    mutedForeground: oklchToken(73, 0.04, 222),
    accent: oklchToken(28.5, 0.05, 210),
    accentForeground: oklchToken(95, 0.015, 222),
    border: oklchToken(31.5, 0.05, 224),
    ring: oklchToken(70, 0.1, 205),
  },
};

const emeraldPreset: ThemePreset = {
  id: "emerald",
  name: "Emerald",
  light: {
    background: oklchToken(97.3, 0.012, 155),
    foreground: oklchToken(26, 0.045, 165),
    card: "oklch(100% 0 0)",
    cardForeground: oklchToken(26, 0.045, 165),
    primary: oklchToken(38, 0.11, 155),
    primaryForeground: "oklch(100% 0 0)",
    link: oklchToken(48, 0.11, 165),
    highlight: HIGHLIGHT,
    highlightForeground: HIGHLIGHT_FOREGROUND,
    muted: oklchToken(94.5, 0.02, 155),
    mutedForeground: oklchToken(50, 0.05, 160),
    accent: oklchToken(95.5, 0.025, 150),
    accentForeground: oklchToken(26, 0.045, 165),
    border: oklchToken(91.5, 0.025, 155),
    ring: oklchToken(38, 0.11, 155),
  },
  dark: {
    background: oklchToken(19.5, 0.03, 165),
    foreground: oklchToken(94.5, 0.02, 160),
    card: oklchToken(24, 0.035, 163),
    cardForeground: oklchToken(94.5, 0.02, 160),
    primary: oklchToken(72, 0.14, 155),
    primaryForeground: oklchToken(17, 0.03, 160),
    link: oklchToken(78, 0.13, 155),
    highlight: HIGHLIGHT,
    highlightForeground: HIGHLIGHT_FOREGROUND,
    muted: oklchToken(28.5, 0.04, 163),
    mutedForeground: oklchToken(73, 0.05, 160),
    accent: oklchToken(28.5, 0.05, 150),
    accentForeground: oklchToken(94.5, 0.02, 160),
    border: oklchToken(31.5, 0.05, 163),
    ring: oklchToken(72, 0.14, 155),
  },
};

const crimsonPreset: ThemePreset = {
  id: "crimson",
  name: "Crimson",
  light: {
    background: oklchToken(97.3, 0.008, 25),
    foreground: oklchToken(26, 0.04, 22),
    card: "oklch(100% 0 0)",
    cardForeground: oklchToken(26, 0.04, 22),
    primary: oklchToken(37, 0.16, 25),
    primaryForeground: "oklch(100% 0 0)",
    link: oklchToken(50, 0.15, 25),
    highlight: HIGHLIGHT,
    highlightForeground: HIGHLIGHT_FOREGROUND,
    muted: oklchToken(94.7, 0.014, 20),
    mutedForeground: oklchToken(52, 0.04, 20),
    accent: oklchToken(95.5, 0.018, 20),
    accentForeground: oklchToken(26, 0.04, 22),
    border: oklchToken(92, 0.018, 20),
    ring: oklchToken(37, 0.16, 25),
  },
  dark: {
    background: oklchToken(19.8, 0.025, 20),
    foreground: oklchToken(95, 0.015, 20),
    card: oklchToken(24.5, 0.035, 20),
    cardForeground: oklchToken(95, 0.015, 20),
    primary: oklchToken(68, 0.16, 25),
    primaryForeground: oklchToken(17.5, 0.03, 20),
    link: oklchToken(74, 0.14, 25),
    highlight: HIGHLIGHT,
    highlightForeground: HIGHLIGHT_FOREGROUND,
    muted: oklchToken(29, 0.04, 20),
    mutedForeground: oklchToken(74, 0.04, 20),
    accent: oklchToken(29, 0.05, 15),
    accentForeground: oklchToken(95, 0.015, 20),
    border: oklchToken(32, 0.05, 20),
    ring: oklchToken(68, 0.16, 25),
  },
};

const violetPreset: ThemePreset = {
  id: "violet",
  name: "Violet",
  light: {
    background: oklchToken(97.5, 0.01, 300),
    foreground: oklchToken(26, 0.05, 296),
    card: "oklch(100% 0 0)",
    cardForeground: oklchToken(26, 0.05, 296),
    primary: oklchToken(37, 0.15, 300),
    primaryForeground: "oklch(100% 0 0)",
    link: oklchToken(52, 0.14, 292),
    highlight: HIGHLIGHT,
    highlightForeground: HIGHLIGHT_FOREGROUND,
    muted: oklchToken(94.8, 0.016, 298),
    mutedForeground: oklchToken(52, 0.045, 296),
    accent: oklchToken(95.8, 0.02, 290),
    accentForeground: oklchToken(26, 0.05, 296),
    border: oklchToken(92.3, 0.02, 297),
    ring: oklchToken(37, 0.15, 300),
  },
  dark: {
    background: oklchToken(19.8, 0.035, 300),
    foreground: oklchToken(95, 0.018, 296),
    card: oklchToken(24.5, 0.045, 299),
    cardForeground: oklchToken(95, 0.018, 296),
    primary: oklchToken(70, 0.13, 292),
    primaryForeground: oklchToken(17.5, 0.03, 296),
    link: oklchToken(76, 0.11, 292),
    highlight: HIGHLIGHT,
    highlightForeground: HIGHLIGHT_FOREGROUND,
    muted: oklchToken(29, 0.05, 299),
    mutedForeground: oklchToken(74, 0.045, 296),
    accent: oklchToken(29, 0.055, 288),
    accentForeground: oklchToken(95, 0.018, 296),
    border: oklchToken(32, 0.055, 299),
    ring: oklchToken(70, 0.13, 292),
  },
};

export const DEFAULT_THEME_PRESET_ID: ThemePresetId = "school";

/**
 * The starting color for Step 26's "Custom" theme picker when a school has
 * never saved one — the pilot school's own brand blue, the same color the
 * `school` preset is built around. Lives here, not in the component, since
 * this is the one directory allowed to hold real color values.
 */
export const DEFAULT_CUSTOM_BRAND_COLOR = "#223060";

/**
 * The top-bar theme dropdown's current value: one of the named presets as a
 * per-browser preview, or "saved" — no preview, showing the school's own
 * saved theme (a named preset or a Step 26 custom brand color).
 */
export type ThemeSelection = ThemePresetId | "saved";

export const themePresets: ThemePreset[] = [
  schoolPreset,
  oceanPreset,
  emeraldPreset,
  crimsonPreset,
  violetPreset,
];

export function getThemePreset(id: string | undefined): ThemePreset {
  return themePresets.find((preset) => preset.id === id) ?? schoolPreset;
}
