import { describe, expect, it } from "vitest";
import { ageInYears } from "./age";

const TODAY = "2026-06-20";

describe("ageInYears", () => {
  it("counts a birthday that already happened this year", () => {
    expect(ageInYears("2012-01-01", TODAY)).toBe(14);
  });

  it("counts today itself as the birthday", () => {
    expect(ageInYears("2012-06-20", TODAY)).toBe(14);
  });

  it("doesn't count a birthday that hasn't happened yet this year", () => {
    expect(ageInYears("2012-06-21", TODAY)).toBe(13);
    expect(ageInYears("2012-12-31", TODAY)).toBe(13);
  });
});
