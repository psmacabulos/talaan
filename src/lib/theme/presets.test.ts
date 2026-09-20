import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, meetsAA } from "./contrast";
import { themePresets, type ThemeColorTokens } from "./presets";

const AA_PAIRS: [keyof ThemeColorTokens, keyof ThemeColorTokens][] = [
  ["background", "foreground"],
  ["card", "cardForeground"],
  ["primary", "primaryForeground"],
  ["muted", "mutedForeground"],
  ["accent", "accentForeground"],
  ["highlight", "highlightForeground"],
];

describe("theme presets", () => {
  it.each(themePresets)("$name passes AA in light and dark mode", (preset) => {
    for (const mode of ["light", "dark"] as const) {
      const tokens = preset[mode];
      for (const [background, foreground] of AA_PAIRS) {
        const ratio = contrastRatio(tokens[background], tokens[foreground]);
        expect(
          meetsAA(ratio),
          `${preset.id}/${mode}: ${background}/${foreground} only has ${ratio.toFixed(2)}:1 contrast`,
        ).toBe(true);
      }

      // Links appear on both `background` and `card` surfaces.
      const linkOnBackground = contrastRatio(tokens.background, tokens.link);
      expect(
        meetsAA(linkOnBackground),
        `${preset.id}/${mode}: link on background only has ${linkOnBackground.toFixed(2)}:1 contrast`,
      ).toBe(true);

      const linkOnCard = contrastRatio(tokens.card, tokens.link);
      expect(
        meetsAA(linkOnCard),
        `${preset.id}/${mode}: link on card only has ${linkOnCard.toFixed(2)}:1 contrast`,
      ).toBe(true);
    }
  });

  it("the school preset matches src/styles/tokens.css exactly", () => {
    const tokensCss = readFileSync(
      path.resolve(__dirname, "../../styles/tokens.css"),
      "utf-8",
    );
    const school = themePresets.find((preset) => preset.id === "school");
    if (!school) throw new Error("school preset not found");

    const lightValues = Object.values(school.light);
    const darkValues = Object.values(school.dark);

    const rootBlockMatch = tokensCss.match(/:root\s*{([^}]*)}/);
    const darkBlockMatch = tokensCss.match(/\.dark\s*{([^}]*)}/);
    if (!rootBlockMatch || !darkBlockMatch) {
      throw new Error("Could not find :root/.dark blocks in tokens.css");
    }
    const rootBlock = rootBlockMatch[1];
    const darkBlock = darkBlockMatch[1];

    for (const value of lightValues) {
      expect(rootBlock, `":root" in tokens.css should contain "${value}"`).toContain(value);
    }
    for (const value of darkValues) {
      expect(darkBlock, `".dark" in tokens.css should contain "${value}"`).toContain(value);
    }
  });
});
