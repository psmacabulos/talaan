import { describe, expect, it } from "vitest";
import type { Parent as ParentRow } from "@/generated/prisma/client";
import { toParent, toParentData } from "./prisma-parent-repository";

const row: ParentRow = {
  id: "parent-a",
  schoolId: "school-a",
  firstName: "Liza",
  lastName: "Cruz",
  mobile: "09170000001",
  email: "liza@school-a.example",
  passwordHash: "scrypt:c2FsdA==:aGFzaA==",
  createdAt: new Date("2026-10-09T00:00:00Z"),
  updatedAt: new Date("2026-10-09T00:00:00Z"),
};

describe("toParent", () => {
  it("turns a row into the app's Parent, without the password hash", () => {
    const parent = toParent(row);
    expect(parent).toEqual({
      id: "parent-a",
      schoolId: "school-a",
      firstName: "Liza",
      lastName: "Cruz",
      mobile: "09170000001",
      email: "liza@school-a.example",
    });
    expect(parent).not.toHaveProperty("passwordHash");
  });

  it("rejects a mobile number the app wouldn't accept", () => {
    expect(() => toParent({ ...row, mobile: "12345" })).toThrow();
  });
});

describe("toParentData", () => {
  it("never includes a password field", () => {
    expect(toParentData(toParent(row))).not.toHaveProperty("passwordHash");
  });
});
