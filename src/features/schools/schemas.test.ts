import { describe, expect, it } from "vitest";
import { notificationPreferenceSchema, schoolSchema } from "./schemas";

const validSchool = {
  id: "school-balanga",
  name: "Balanga City National Science High School",
  theme: { kind: "preset" as const, presetId: "school" },
  showDepedLogo: false,
  notificationPreference: "time_in_only" as const,
};

describe("schoolSchema", () => {
  it("accepts a school using a built-in preset", () => {
    expect(schoolSchema.safeParse(validSchool).success).toBe(true);
  });

  it("accepts a school using a custom brand color", () => {
    const result = schoolSchema.safeParse({
      ...validSchool,
      id: "school-custom",
      name: "Some Other High School",
      theme: { kind: "custom", brandColor: "#223060" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown preset id", () => {
    const result = schoolSchema.safeParse({
      ...validSchool,
      theme: { kind: "preset", presetId: "sunset" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a custom brand color that isn't a hex value", () => {
    const result = schoolSchema.safeParse({
      ...validSchool,
      theme: { kind: "custom", brandColor: "blue" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a school with no name", () => {
    const result = schoolSchema.safeParse({ ...validSchool, name: "" });
    expect(result.success).toBe(false);
  });

  it("requires a notification preference", () => {
    const withoutPreference: Record<string, unknown> = { ...validSchool };
    delete withoutPreference.notificationPreference;
    expect(schoolSchema.safeParse(withoutPreference).success).toBe(false);
  });
});

describe("notificationPreferenceSchema", () => {
  it("accepts all three real preferences", () => {
    expect(notificationPreferenceSchema.safeParse("off").success).toBe(true);
    expect(notificationPreferenceSchema.safeParse("time_in_only").success).toBe(true);
    expect(notificationPreferenceSchema.safeParse("time_in_and_time_out").success).toBe(true);
  });

  it("rejects anything else", () => {
    expect(notificationPreferenceSchema.safeParse("time_out_only").success).toBe(false);
    expect(notificationPreferenceSchema.safeParse("on").success).toBe(false);
  });
});
