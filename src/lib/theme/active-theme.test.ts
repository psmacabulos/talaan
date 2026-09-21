import { describe, expect, it } from "vitest";
import type { School } from "@/features/schools/types";
import { getThemePreset } from "./presets";
import { resolveActiveTheme, resolveSchoolTheme } from "./active-theme";

const oceanSchool: School = {
  id: "school-oceanview",
  name: "Oceanview National High School",
  theme: { kind: "preset", presetId: "ocean" },
  showDepedLogo: false,
  notificationPreference: "time_in_only",
};

describe("resolveSchoolTheme", () => {
  it("looks up a named preset", () => {
    const resolved = resolveSchoolTheme({ kind: "preset", presetId: "ocean" });
    const preset = getThemePreset("ocean");
    expect(resolved).toEqual({ light: preset.light, dark: preset.dark });
  });

  it("derives a full palette from a custom brand color", () => {
    const resolved = resolveSchoolTheme({ kind: "custom", brandColor: "#223060" });
    expect(resolved.light.primary).toMatch(/^oklch\(/);
    expect(resolved.dark.primary).toMatch(/^oklch\(/);
  });
});

describe("resolveActiveTheme", () => {
  it("uses the school's own theme when there's no override", () => {
    const resolved = resolveActiveTheme(oceanSchool);
    const preset = getThemePreset("ocean");
    expect(resolved).toEqual({ light: preset.light, dark: preset.dark });
  });

  it("prefers the override preset over the school's own theme", () => {
    const resolved = resolveActiveTheme(oceanSchool, "crimson");
    const preset = getThemePreset("crimson");
    expect(resolved).toEqual({ light: preset.light, dark: preset.dark });
  });

  it("falls back to the app default when there's no school (a super admin with none in view)", () => {
    const resolved = resolveActiveTheme(null);
    const preset = getThemePreset("school");
    expect(resolved).toEqual({ light: preset.light, dark: preset.dark });
  });

  it("still applies an override with no school", () => {
    const resolved = resolveActiveTheme(null, "violet");
    const preset = getThemePreset("violet");
    expect(resolved).toEqual({ light: preset.light, dark: preset.dark });
  });
});
