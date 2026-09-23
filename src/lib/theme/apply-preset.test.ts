import { describe, expect, it } from "vitest";
import { presetToCss, presetToScopedCss, tokensToScopedCss } from "./apply-preset";
import { themePresets } from "./presets";

const schoolPreset = themePresets.find((preset) => preset.id === "school");
if (!schoolPreset) throw new Error("school preset not found");

describe("presetToCss", () => {
  it("reproduces tokens.css's current values for the school preset", () => {
    const css = presetToCss(schoolPreset);
    expect(css).toContain("--background: oklch(97.5% 0.006 255.5);");
    expect(css).toContain("--primary: oklch(32.5% 0.087 268.9);");
    expect(css).toContain("--ring: oklch(67.5% 0.081 231.4);");
  });

  it("emits exactly one doubled :root:root block and one .dark.dark block", () => {
    const css = presetToCss(schoolPreset);
    expect(css.match(/:root:root\{/g)).toHaveLength(1);
    expect(css.match(/\.dark\.dark\{/g)).toHaveLength(1);
  });

  it("includes every color token for both light and dark", () => {
    const css = presetToCss(schoolPreset);
    for (const key of Object.values(schoolPreset.light)) {
      expect(css).toContain(key);
    }
    for (const key of Object.values(schoolPreset.dark)) {
      expect(css).toContain(key);
    }
  });
});

describe("presetToScopedCss", () => {
  it("scopes declarations to the given selector instead of :root/.dark", () => {
    const css = presetToScopedCss(schoolPreset, "[data-preset-preview]");
    expect(css).toContain("[data-preset-preview]{");
    expect(css).toContain(".dark [data-preset-preview]{");
    expect(css).not.toContain(":root");
  });
});

describe("tokensToScopedCss", () => {
  it("scopes one mode's declarations with no .dark variant", () => {
    const css = tokensToScopedCss(schoolPreset.dark, '[data-preview-tile="dark"]');
    expect(css.startsWith('[data-preview-tile="dark"]{')).toBe(true);
    expect(css).toContain(`--primary: ${schoolPreset.dark.primary};`);
    expect(css).not.toContain(".dark");
  });
});
