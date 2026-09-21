import { describe, expect, it } from "vitest";
import { staffSchema } from "./schemas";

describe("staffSchema", () => {
  it("accepts a principal scoped to a school", () => {
    const result = staffSchema.safeParse({
      id: "staff-0001",
      schoolId: "school-balanga",
      role: "principal",
      firstName: "Ana",
      lastName: "Reyes",
      email: "ana.reyes@example.com",
      status: "active",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a teacher with an advisory class", () => {
    const result = staffSchema.safeParse({
      id: "staff-0002",
      schoolId: "school-balanga",
      role: "teacher",
      firstName: "Mark",
      lastName: "Santos",
      email: "mark.santos@example.com",
      status: "active",
      advisoryGradeLevel: 9,
      advisorySection: "Rizal",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a super admin with no school", () => {
    const result = staffSchema.safeParse({
      id: "staff-0003",
      schoolId: null,
      role: "super_admin",
      firstName: "Lea",
      lastName: "Cruz",
      email: "lea.cruz@example.com",
      status: "active",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a super admin with a school (they're global, not scoped)", () => {
    const result = staffSchema.safeParse({
      id: "staff-0004",
      schoolId: "school-balanga",
      role: "super_admin",
      firstName: "Lea",
      lastName: "Cruz",
      email: "lea.cruz@example.com",
      status: "active",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a principal or teacher with no school", () => {
    const principal = staffSchema.safeParse({
      id: "staff-0005",
      schoolId: null,
      role: "principal",
      firstName: "Ana",
      lastName: "Reyes",
      email: "ana.reyes@example.com",
      status: "active",
    });
    expect(principal.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = staffSchema.safeParse({
      id: "staff-0006",
      schoolId: "school-balanga",
      role: "teacher",
      firstName: "Mark",
      lastName: "Santos",
      email: "not-an-email",
      status: "active",
    });
    expect(result.success).toBe(false);
  });
});
