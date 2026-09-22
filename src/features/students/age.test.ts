import { describe, expect, it } from "vitest";
import { ageInYears } from "./age";

const NOW = "2026-06-20T09:15:00Z";

describe("ageInYears", () => {
  it("counts a birthday that already happened this year", () => {
    expect(ageInYears("2012-01-01", NOW)).toBe(14);
  });

  it("counts today itself as the birthday", () => {
    expect(ageInYears("2012-06-20", NOW)).toBe(14);
  });

  it("doesn't count a birthday that hasn't happened yet this year", () => {
    expect(ageInYears("2012-06-21", NOW)).toBe(13);
    expect(ageInYears("2012-12-31", NOW)).toBe(13);
  });

  it("defaults 'now' to the app's fixed demo date", () => {
    expect(ageInYears("2012-01-01")).toBe(14);
  });
});
