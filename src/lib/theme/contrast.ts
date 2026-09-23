/*
 * Contrast helper: the accessibility half of the design system. Every
 * preset (presets.ts) and every future custom brand color (Step 21's
 * "Custom" theme picker) must pass WCAG AA — this file is what checks
 * that, and what computes a readable foreground when one isn't given.
 */

import { clampChroma, oklch, wcagContrast } from "culori";
import type { Oklch } from "culori";
import { toOklchString } from "./oklch";
import type { ThemeColorTokens } from "./presets";

function parseOklch(color: string): Oklch {
  const parsed = oklch(color);
  if (!parsed) {
    throw new Error(`Not a valid color: "${color}"`);
  }
  return parsed;
}

function formatOklch(color: Oklch): string {
  return toOklchString(color.l, color.c, color.h ?? 0);
}

/** WCAG contrast ratio between two colors (any CSS color string culori understands). */
export function contrastRatio(a: string, b: string): number {
  return wcagContrast(a, b);
}

/** WCAG AA: 4.5:1 for normal text, 3:1 for large text (18pt+/14pt+ bold). */
export function meetsAA(ratio: number, options: { largeText?: boolean } = {}): boolean {
  return ratio >= (options.largeText ? 3 : 4.5);
}

const PURE_WHITE = "oklch(100% 0 0)";
const PURE_BLACK = "oklch(0% 0 0)";

/**
 * Returns the first candidate that passes AA against `background`. If none
 * do, falls back to whichever of pure black/white contrasts more — which is
 * mathematically guaranteed to pass AA for any background (the two ratios
 * are closest, at ~4.58:1, right at the point their luminances cross; either
 * side of that point one of them is higher still).
 */
export function pickReadableForeground(
  background: string,
  candidates: string[] = [],
  options: { largeText?: boolean } = {},
): string {
  for (const candidate of candidates) {
    if (meetsAA(contrastRatio(background, candidate), options)) {
      return candidate;
    }
  }
  const toWhite = contrastRatio(background, PURE_WHITE);
  const toBlack = contrastRatio(background, PURE_BLACK);
  return toWhite >= toBlack ? PURE_WHITE : PURE_BLACK;
}

function nudgeLightnessUntilReadable(
  color: Oklch,
  against: string,
  direction: "lighter" | "darker",
  options: { largeText?: boolean } = {},
): Oklch {
  let candidate = color;
  const step = direction === "lighter" ? 0.005 : -0.005;
  let guard = 0;
  while (
    !meetsAA(contrastRatio(against, formatOklch(candidate)), options) &&
    candidate.l + step >= 0 &&
    candidate.l + step <= 1 &&
    guard < 200
  ) {
    candidate = clampChroma({ ...candidate, l: candidate.l + step }, "oklch");
    guard += 1;
  }
  return candidate;
}

export type CustomPalette = {
  light: ThemeColorTokens;
  dark: ThemeColorTokens;
};

// Reused as-is from the built-in presets — see presets.ts for why highlight
// is treated as a fixed "flagged" accent rather than a per-brand color.
const HIGHLIGHT = "oklch(90.6% 0.184 102)";
const HIGHLIGHT_FOREGROUND = "oklch(25.2% 0.061 262.8)";

/**
 * Derives a full light/dark token set from one brand color, for the future
 * "Custom" theme picker (Step 21). Every foreground/background pair in the
 * result is guaranteed to pass AA — colors that don't naturally pass are
 * nudged (never just left failing), per CLAUDE.md's "adjust or reject a
 * color that fails."
 */
export function generateCustomPalette(brandColor: string): CustomPalette {
  const brand = clampChroma(parseOklch(brandColor), "oklch");
  const hue = brand.h ?? 0;

  const darkText = clampChroma({ mode: "oklch", l: 0.25, c: 0.06, h: hue }, "oklch");
  const lightText = clampChroma({ mode: "oklch", l: 0.95, c: 0.016, h: hue }, "oklch");

  const lightBackground = clampChroma({ mode: "oklch", l: 0.975, c: 0.01, h: hue }, "oklch");
  const lightCard: Oklch = { mode: "oklch", l: 1, c: 0, h: 0 };
  const lightMuted = clampChroma({ mode: "oklch", l: 0.947, c: 0.015, h: hue }, "oklch");
  const lightAccent = clampChroma({ mode: "oklch", l: 0.958, c: 0.02, h: hue - 30 }, "oklch");
  const lightBorder = clampChroma({ mode: "oklch", l: 0.923, c: 0.017, h: hue }, "oklch");

  let lightPrimary: Oklch = clampChroma(
    { mode: "oklch", l: Math.min(brand.l, 0.45), c: brand.c, h: hue },
    "oklch",
  );
  lightPrimary = nudgeLightnessUntilReadable(lightPrimary, PURE_WHITE, "darker");
  let lightLink: Oklch = clampChroma({ mode: "oklch", l: 0.5, c: brand.c, h: hue }, "oklch");
  lightLink = nudgeLightnessUntilReadable(lightLink, formatOklch(lightBackground), "darker");

  const light: ThemeColorTokens = {
    background: formatOklch(lightBackground),
    foreground: pickReadableForeground(formatOklch(lightBackground), [formatOklch(darkText)]),
    card: formatOklch(lightCard),
    cardForeground: pickReadableForeground(formatOklch(lightCard), [formatOklch(darkText)]),
    primary: formatOklch(lightPrimary),
    primaryForeground: pickReadableForeground(formatOklch(lightPrimary), [PURE_WHITE]),
    link: formatOklch(lightLink),
    highlight: HIGHLIGHT,
    highlightForeground: HIGHLIGHT_FOREGROUND,
    muted: formatOklch(lightMuted),
    mutedForeground: pickReadableForeground(formatOklch(lightMuted), [formatOklch(darkText)]),
    accent: formatOklch(lightAccent),
    accentForeground: pickReadableForeground(formatOklch(lightAccent), [formatOklch(darkText)]),
    border: formatOklch(lightBorder),
    ring: formatOklch(lightPrimary),
  };

  const darkBackground = clampChroma({ mode: "oklch", l: 0.198, c: 0.035, h: hue }, "oklch");
  const darkCard = clampChroma({ mode: "oklch", l: 0.242, c: 0.045, h: hue }, "oklch");
  const darkMuted = clampChroma({ mode: "oklch", l: 0.291, c: 0.05, h: hue }, "oklch");
  const darkAccent = clampChroma({ mode: "oklch", l: 0.292, c: 0.055, h: hue - 30 }, "oklch");
  const darkBorder = clampChroma({ mode: "oklch", l: 0.32, c: 0.055, h: hue }, "oklch");

  let darkPrimary: Oklch = clampChroma(
    { mode: "oklch", l: Math.max(brand.l, 0.55), c: brand.c * 0.9, h: hue },
    "oklch",
  );
  darkPrimary = nudgeLightnessUntilReadable(darkPrimary, formatOklch(darkBackground), "lighter");
  let darkLink: Oklch = clampChroma({ mode: "oklch", l: 0.74, c: brand.c * 0.8, h: hue }, "oklch");
  darkLink = nudgeLightnessUntilReadable(darkLink, formatOklch(darkBackground), "lighter");

  const dark: ThemeColorTokens = {
    background: formatOklch(darkBackground),
    foreground: pickReadableForeground(formatOklch(darkBackground), [formatOklch(lightText)]),
    card: formatOklch(darkCard),
    cardForeground: pickReadableForeground(formatOklch(darkCard), [formatOklch(lightText)]),
    primary: formatOklch(darkPrimary),
    primaryForeground: pickReadableForeground(formatOklch(darkPrimary), [
      formatOklch(darkBackground),
    ]),
    link: formatOklch(darkLink),
    highlight: HIGHLIGHT,
    highlightForeground: HIGHLIGHT_FOREGROUND,
    muted: formatOklch(darkMuted),
    mutedForeground: pickReadableForeground(formatOklch(darkMuted), [formatOklch(lightText)]),
    accent: formatOklch(darkAccent),
    accentForeground: pickReadableForeground(formatOklch(darkAccent), [formatOklch(lightText)]),
    border: formatOklch(darkBorder),
    ring: formatOklch(darkPrimary),
  };

  return { light, dark };
}

export type CustomBrandColorCheck = {
  /** The shade light-mode buttons actually use — generateCustomPalette's primary. */
  buttonColor: string;
  /** The button text color that sits on it. */
  buttonTextColor: string;
  /** Contrast of that pair — always AA or better. */
  ratio: number;
  /**
   * True when the brand color itself couldn't be used as-is for buttons and
   * was darkened (never just left failing) — Step 26 shows the school both
   * colors side by side when this happens, so the change is never silent.
   */
  adjusted: boolean;
};

// How far (OKLCH lightness, 0–1) the button shade may drift from the brand
// color before it counts as a visible change worth telling the school about.
const VISIBLE_LIGHTNESS_CHANGE = 0.02;

/**
 * Step 26's contrast check for a "Custom" brand color: what buttons will
 * really look like, how readable they are, and whether the color had to be
 * corrected to get there. Throws for a string that isn't a color at all —
 * callers validate the hex format first (schoolThemeSchema).
 */
export function checkCustomBrandColor(brandColor: string): CustomBrandColorCheck {
  const brand = parseOklch(brandColor);
  const { light } = generateCustomPalette(brandColor);
  const button = parseOklch(light.primary);
  return {
    buttonColor: light.primary,
    buttonTextColor: light.primaryForeground,
    ratio: contrastRatio(light.primary, light.primaryForeground),
    adjusted: Math.abs(brand.l - button.l) > VISIBLE_LIGHTNESS_CHANGE,
  };
}
