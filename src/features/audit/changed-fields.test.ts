import { describe, expect, it } from "vitest";
import { changedStudentFields } from "./changed-fields";

const before: Parameters<typeof changedStudentFields>[0] = {
  firstName: "Juan",
  lastName: "Dela Cruz",
  birthDate: "2012-03-04",
  gradeLevel: 7,
  section: "A",
  guardianName: "Maria Dela Cruz",
  guardianMobile: "09171234567",
};

describe("changedStudentFields (Step 60.1)", () => {
  it("names only the fields that changed", () => {
    expect(changedStudentFields(before, { ...before, section: "B", lrn: "123456789012" }, false)).toEqual([
      "lrn",
      "section",
    ]);
  });

  it("says nothing for a save that changed nothing", () => {
    expect(changedStudentFields(before, { ...before }, false)).toEqual([]);
  });

  it("adds the photo when it changed, and never a value", () => {
    const changed = changedStudentFields(before, { ...before, firstName: "Jon" }, true);
    expect(changed).toEqual(["firstName", "photo"]);
    expect(JSON.stringify(changed)).not.toContain("Jon");
  });
});
