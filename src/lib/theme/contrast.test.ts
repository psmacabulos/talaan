import { displayable } from "culori";
import { describe, expect, it } from "vitest";
import {
  checkCustomBrandColor,
  contrastRatio,
  generateCustomPalette,
  meetsAA,
  pickReadableForeground,
} from "./contrast";
import type { ThemeColorTokens } from "./presets";

describe("contrastRatio", () => {
  it("returns ~21:1 for pure black on pure white", () => {
    expect(contrastRatio("oklch(100% 0 0)", "oklch(0% 0 0)")).toBeCloseTo(21, 0);
  });

  it("returns 1:1 for identical colors", () => {
    expect(contrastRatio("oklch(50% 0.1 200)", "oklch(50% 0.1 200)")).toBeCloseTo(1, 5);
  });
});

describe("meetsAA", () => {
  it("passes normal text at or above 4.5:1", () => {
    expect(meetsAA(4.5)).toBe(true);
    expect(meetsAA(5)).toBe(true);
  });

  it("fails normal text below 4.5:1", () => {
    expect(meetsAA(4.49)).toBe(false);
  });

  it("uses the 3:1 threshold for large text", () => {
    expect(meetsAA(3, { largeText: true })).toBe(true);
    expect(meetsAA(2.99, { largeText: true })).toBe(false);
    expect(meetsAA(3, { largeText: false })).toBe(false);
  });
});

describe("pickReadableForeground", () => {
  it("prefers an on-brand candidate that already passes AA", () => {
    const background = "oklch(97.5% 0.006 255.5)"; // school's light background
    const onBrandForeground = "oklch(25.2% 0.061 262.8)"; // school's light foreground
    const result = pickReadableForeground(background, [onBrandForeground]);
    expect(result).toBe(onBrandForeground);
  });

  it("falls back to a light color against a very dark background", () => {
    const background = "oklch(10% 0.02 260)";
    const result = pickReadableForeground(background, ["oklch(20% 0.02 260)"]);
    expect(meetsAA(contrastRatio(background, result))).toBe(true);
  });

  it("falls back to a dark color against a very light background", () => {
    const background = "oklch(95% 0.02 260)";
    const result = pickReadableForeground(background, ["oklch(85% 0.02 260)"]);
    expect(meetsAA(contrastRatio(background, result))).toBe(true);
  });

  it("always returns something that passes AA even with no candidates", () => {
    for (const background of ["oklch(0% 0 0)", "oklch(50% 0.1 30)", "oklch(100% 0 0)"]) {
      const result = pickReadableForeground(background, []);
      expect(meetsAA(contrastRatio(background, result))).toBe(true);
    }
  });
});

describe("generateCustomPalette", () => {
  const pairs: [keyof ThemeColorTokens, keyof ThemeColorTokens][] = [
    ["background", "foreground"],
    ["card", "cardForeground"],
    ["primary", "primaryForeground"],
    ["muted", "mutedForeground"],
    ["accent", "accentForeground"],
    ["highlight", "highlightForeground"],
  ];

  it.each(["#223060", "#1C77A5", "#B4232C", "#3B5BDB"])(
    "generates an all-AA-passing, in-gamut palette from %s",
    (brandColor) => {
      const { light, dark } = generateCustomPalette(brandColor);

      for (const tokens of [light, dark]) {
        for (const [background, foreground] of pairs) {
          const ratio = contrastRatio(tokens[background], tokens[foreground]);
          expect(meetsAA(ratio)).toBe(true);
        }
        expect(meetsAA(contrastRatio(tokens.background, tokens.link))).toBe(true);

        for (const value of Object.values(tokens)) {
          expect(displayable(value)).toBe(true);
        }
      }
    },
  );
});

describe("checkCustomBrandColor", () => {
  it("keeps a dark brand color as-is and reports a passing ratio", () => {
    const check = checkCustomBrandColor("#223060");
    expect(check.adjusted).toBe(false);
    expect(meetsAA(check.ratio)).toBe(true);
  });

  it("darkens a too-light brand color and says so", () => {
    const check = checkCustomBrandColor("#F9E321");
    expect(check.adjusted).toBe(true);
    expect(meetsAA(check.ratio)).toBe(true);
    // The corrected button shade must itself be darker than the input.
    expect(contrastRatio(check.buttonColor, "oklch(100% 0 0)")).toBeGreaterThan(
      contrastRatio("#F9E321", "oklch(100% 0 0)"),
    );
  });

  it("always lands on an AA pair, even for pure white", () => {
    const check = checkCustomBrandColor("#FFFFFF");
    expect(check.adjusted).toBe(true);
    expect(meetsAA(check.ratio)).toBe(true);
  });

  it("throws for something that isn't a color", () => {
    expect(() => checkCustomBrandColor("not a color")).toThrow();
  });
});
