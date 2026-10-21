import { describe, expect, it } from "vitest";
import { hasNavAccess, navItemsForRole } from "./nav-items";

describe("navItemsForRole", () => {
  it("gives a super admin every section", () => {
    expect(navItemsForRole("super_admin").map((item) => item.segment)).toEqual([
      "schools",
      "dashboard",
      "attendance",
      "students",
      "staff",
      "settings",
    ]);
  });

  it("gives a principal every section except Schools", () => {
    expect(navItemsForRole("principal").map((item) => item.segment)).toEqual([
      "dashboard",
      "attendance",
      "students",
      "staff",
      "settings",
    ]);
  });

  it("keeps a teacher to their own class's screens", () => {
    expect(navItemsForRole("teacher").map((item) => item.segment)).toEqual(["dashboard", "attendance", "students"]);
  });
});

describe("hasNavAccess", () => {
  it("blocks a teacher from staff and settings", () => {
    expect(hasNavAccess("teacher", "staff")).toBe(false);
    expect(hasNavAccess("teacher", "settings")).toBe(false);
  });

  it("blocks a non-super-admin from Schools", () => {
    expect(hasNavAccess("principal", "schools")).toBe(false);
    expect(hasNavAccess("teacher", "schools")).toBe(false);
  });

  it("allows a principal to reach staff and settings", () => {
    expect(hasNavAccess("principal", "staff")).toBe(true);
    expect(hasNavAccess("principal", "settings")).toBe(true);
  });

  it("allows a super admin everywhere", () => {
    for (const segment of ["schools", "dashboard", "attendance", "students", "staff", "settings"] as const) {
      expect(hasNavAccess("super_admin", segment)).toBe(true);
    }
  });
});
