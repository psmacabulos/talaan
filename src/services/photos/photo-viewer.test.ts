import { describe, expect, it } from "vitest";
import { canViewPhoto } from "./photo-viewer";

const KEY = "school-balanga/student-0001/k3x9q2ab.webp";

describe("canViewPhoto", () => {
  it("shows a photo to its own school only", () => {
    expect(canViewPhoto(KEY, { schoolId: "school-balanga" })).toBe(true);
    expect(canViewPhoto(KEY, { schoolId: "school-oceanview" })).toBe(false);
  });

  it("shows every school's photos to a super admin, and nothing to nobody", () => {
    expect(canViewPhoto(KEY, { allSchools: true })).toBe(true);
    expect(canViewPhoto(KEY, null)).toBe(false);
  });
});
