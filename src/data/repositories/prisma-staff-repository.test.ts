import { describe, expect, it } from "vitest";
import type { Staff as StaffRow } from "@/generated/prisma/client";
import type { Staff } from "@/features/staff/types";
import { toStaff, toStaffData } from "./prisma-staff-repository";

const row: StaffRow = {
  id: "staff-a",
  schoolId: "school-a",
  role: "teacher",
  firstName: "Ana",
  lastName: "Reyes",
  email: "ana@school-a.example",
  status: "active",
  advisoryGradeLevel: 7,
  advisorySection: "Rizal",
  createdAt: new Date("2026-10-08T00:00:00Z"),
  updatedAt: new Date("2026-10-08T00:00:00Z"),
};

describe("toStaff", () => {
  it("turns a database row into the app's Staff, dropping the timestamps", () => {
    expect(toStaff(row)).toEqual({
      id: "staff-a",
      schoolId: "school-a",
      role: "teacher",
      firstName: "Ana",
      lastName: "Reyes",
      email: "ana@school-a.example",
      status: "active",
      advisoryGradeLevel: 7,
      advisorySection: "Rizal",
    });
  });

  it("leaves out an advisory class the row doesn't have", () => {
    const staff = toStaff({ ...row, role: "principal", advisoryGradeLevel: null, advisorySection: null });
    expect(staff.advisoryGradeLevel).toBeUndefined();
    expect(staff.advisorySection).toBeUndefined();
  });

  it("rejects an advisory grade outside 7 to 12", () => {
    expect(() => toStaff({ ...row, advisoryGradeLevel: 13 })).toThrow();
  });

  it("rejects a principal with no school", () => {
    expect(() => toStaff({ ...row, role: "principal", schoolId: null })).toThrow();
  });
});

describe("toStaffData", () => {
  it("stores a missing advisory class as null", () => {
    const staff: Staff = {
      id: "staff-b",
      schoolId: "school-a",
      role: "principal",
      firstName: "Ben",
      lastName: "Santos",
      email: "ben@school-a.example",
      status: "invited",
    };
    expect(toStaffData(staff)).toMatchObject({ advisoryGradeLevel: null, advisorySection: null });
  });
});
