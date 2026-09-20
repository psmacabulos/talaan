import { clampChroma } from "culori";

/**
 * Formats an OKLCH color as a CSS string, rounding for readability while
 * guaranteeing the rounded string itself stays in the sRGB gamut.
 *
 * Chroma is clamped against the *rounded* lightness/hue (not the raw input),
 * then rounded down, never up. Rounding after clamping — or rounding up —
 * can push a color that was exactly on the gamut boundary just outside it,
 * which is a real, floating-point-precision failure mode, not a
 * hypothetical one (it's what src/lib/theme/contrast.test.ts's
 * `generateCustomPalette` AA/gamut tests catch if this drifts).
 *
 * `l` is a fraction (0–1), matching culori's own Oklch representation.
 */
export function toOklchString(l: number, c: number, h: number): string {
  const roundedL = Math.round(l * 1000) / 1000;
  const roundedH = Math.round(h * 10) / 10;
  const clamped = clampChroma({ mode: "oklch", l: roundedL, c, h: roundedH }, "oklch");
  const safeChroma = Math.floor(clamped.c * 1000) / 1000;
  return `oklch(${(roundedL * 100).toFixed(1)}% ${safeChroma.toFixed(3)} ${roundedH.toFixed(1)})`;
}
