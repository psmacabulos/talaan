import { describe, expect, it } from "vitest";
import type { School as SchoolRow } from "@/generated/prisma/client";
import type { School } from "@/features/schools/types";
import { toSchool, toSchoolData } from "./prisma-school-repository";

const row: SchoolRow = {
  id: "school-a",
  name: "School A",
  address: null,
  theme: { kind: "preset", presetId: "ocean" },
  logoUrl: null,
  showDepedLogo: false,
  notificationPreference: "time_in_only",
  createdAt: new Date("2026-10-05T00:00:00Z"),
  updatedAt: new Date("2026-10-05T00:00:00Z"),
};

describe("toSchool", () => {
  it("turns a database row into the app's School, dropping the timestamps", () => {
    expect(toSchool(row)).toEqual({
      id: "school-a",
      name: "School A",
      theme: { kind: "preset", presetId: "ocean" },
      showDepedLogo: false,
      notificationPreference: "time_in_only",
    });
  });

  it("keeps a logo when the row has one", () => {
    expect(toSchool({ ...row, logoUrl: "https://example.com/logo.png" }).logoUrl).toBe("https://example.com/logo.png");
  });

  it("rejects a row whose theme isn't a valid theme", () => {
    expect(() => toSchool({ ...row, theme: { kind: "preset", presetId: "not-a-preset" } })).toThrow();
  });
});

describe("toSchoolData", () => {
  it("stores a missing logo as null, so an update can clear it", () => {
    const school: School = {
      id: "school-a",
      name: "School A",
      theme: { kind: "preset", presetId: "violet" },
      showDepedLogo: true,
      notificationPreference: "off",
    };
    expect(toSchoolData(school).logoUrl).toBeNull();
  });
});
