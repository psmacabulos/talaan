import { describe, expect, it } from "vitest";
import {
  notificationKindSchema,
  notificationSchema,
  parentSchema,
  parentStudentLinkSchema,
} from "./schemas";

const validParent = {
  id: "parent-0001",
  schoolId: "school-balanga",
  firstName: "Maria",
  lastName: "Dela Cruz",
  mobile: "09171234567",
  email: "maria@example.com",
};

describe("parentSchema", () => {
  it("accepts a valid parent", () => {
    expect(parentSchema.safeParse(validParent).success).toBe(true);
  });

  it("rejects an empty schoolId", () => {
    expect(parentSchema.safeParse({ ...validParent, schoolId: "" }).success).toBe(false);
  });

  it("rejects a mobile number that isn't a PH mobile", () => {
    expect(parentSchema.safeParse({ ...validParent, mobile: "12345" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(parentSchema.safeParse({ ...validParent, email: "not-an-email" }).success).toBe(false);
  });
});

describe("parentStudentLinkSchema", () => {
  const validLink = {
    id: "link-0001",
    schoolId: "school-balanga",
    parentId: "parent-0001",
    studentId: "student-0001",
    linkedAt: "2026-06-01T08:00:00Z",
  };

  it("accepts a valid link", () => {
    expect(parentStudentLinkSchema.safeParse(validLink).success).toBe(true);
  });

  it("requires both a parentId and a studentId", () => {
    expect(parentStudentLinkSchema.safeParse({ ...validLink, parentId: "" }).success).toBe(false);
    expect(parentStudentLinkSchema.safeParse({ ...validLink, studentId: "" }).success).toBe(false);
  });
});

describe("notificationKindSchema", () => {
  it("accepts time_in and time_out", () => {
    expect(notificationKindSchema.safeParse("time_in").success).toBe(true);
    expect(notificationKindSchema.safeParse("time_out").success).toBe(true);
  });

  it("rejects an unknown kind", () => {
    expect(notificationKindSchema.safeParse("lunch").success).toBe(false);
  });
});

describe("notificationSchema", () => {
  const validNotification = {
    id: "notification-0001",
    schoolId: "school-balanga",
    studentId: "student-0001",
    kind: "time_in",
    tappedAt: "2026-06-20T07:56:00Z",
    read: false,
  };

  it("accepts a valid notification", () => {
    expect(notificationSchema.safeParse(validNotification).success).toBe(true);
  });

  it("rejects an empty studentId", () => {
    expect(notificationSchema.safeParse({ ...validNotification, studentId: "" }).success).toBe(false);
  });
});
