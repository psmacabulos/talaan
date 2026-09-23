import { describe, expect, it } from "vitest";
import { createSchoolSchema, notificationPreferenceSchema, schoolSchema } from "./schemas";

const validSchool = {
  id: "school-balanga",
  name: "Balanga City National Science High School",
  theme: { kind: "preset" as const, presetId: "school" },
  showDepedLogo: false,
  notificationPreference: "time_in_only" as const,
};

const validCreateSchool = {
  name: "Sta. Rita National High School",
  principalFirstName: "Maria",
  principalLastName: "Santos",
  principalEmail: "maria.santos@example.com",
  presetId: "ocean" as const,
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

describe("createSchoolSchema", () => {
  it("accepts a valid new school without a logo", () => {
    expect(createSchoolSchema.safeParse(validCreateSchool).success).toBe(true);
  });

  it("accepts a data-URL logo", () => {
    const result = createSchoolSchema.safeParse({
      ...validCreateSchool,
      logoUrl: "data:image/png;base64,iVBORw0KGgo=",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a school with no name", () => {
    const result = createSchoolSchema.safeParse({ ...validCreateSchool, name: "  " });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid principal email", () => {
    const result = createSchoolSchema.safeParse({ ...validCreateSchool, principalEmail: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown preset id", () => {
    const result = createSchoolSchema.safeParse({ ...validCreateSchool, presetId: "sunset" });
    expect(result.success).toBe(false);
  });

  it("rejects an oversize logo data URL", () => {
    const result = createSchoolSchema.safeParse({
      ...validCreateSchool,
      logoUrl: `data:image/png;base64,${"A".repeat(1_500_001)}`,
    });
    expect(result.success).toBe(false);
  });
});
