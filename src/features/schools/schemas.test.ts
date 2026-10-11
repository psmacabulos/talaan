import { describe, expect, it } from "vitest";
import { attendanceTimesSchema, createSchoolSchema, notificationPreferenceSchema, schoolSchema } from "./schemas";

const validSchool = {
  id: "school-balanga",
  name: "Balanga City National Science High School",
  theme: { kind: "preset" as const, presetId: "school" },
  showDepedLogo: false,
  notificationPreference: "time_in_only" as const,
  lateAfter: "08:05",
  absentFrom: "09:00",
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

  it("requires both attendance times", () => {
    const withoutTimes: Record<string, unknown> = { ...validSchool };
    delete withoutTimes.lateAfter;
    expect(schoolSchema.safeParse(withoutTimes).success).toBe(false);
  });
});

describe("attendanceTimesSchema", () => {
  it("accepts two zero-padded 24-hour times, absent after late", () => {
    expect(attendanceTimesSchema.safeParse({ lateAfter: "08:05", absentFrom: "09:00" }).success).toBe(true);
    expect(attendanceTimesSchema.safeParse({ lateAfter: "13:30", absentFrom: "14:00" }).success).toBe(true);
  });

  it("rejects a time that isn't HH:MM", () => {
    expect(attendanceTimesSchema.safeParse({ lateAfter: "8:05", absentFrom: "09:00" }).success).toBe(false);
    expect(attendanceTimesSchema.safeParse({ lateAfter: "08:05", absentFrom: "25:00" }).success).toBe(false);
    expect(attendanceTimesSchema.safeParse({ lateAfter: "08:60", absentFrom: "09:00" }).success).toBe(false);
  });

  it("rejects an absent time at or before the late time, on the absent field", () => {
    const same = attendanceTimesSchema.safeParse({ lateAfter: "08:15", absentFrom: "08:15" });
    const before = attendanceTimesSchema.safeParse({ lateAfter: "08:15", absentFrom: "08:00" });
    expect(same.success).toBe(false);
    expect(before.success).toBe(false);
    expect(before.error?.issues[0]?.path).toEqual(["absentFrom"]);
    expect(before.error?.issues[0]?.message).toBe("The absent time has to be later than the late time");
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
