import { describe, expect, it } from "vitest";
import type { ParentStudentLink as LinkRow } from "@/generated/prisma/client";
import { toParentStudentLink, toParentStudentLinkData } from "./prisma-parent-student-link-repository";

const row: LinkRow = {
  id: "link-a",
  schoolId: "school-a",
  parentId: "parent-a",
  studentId: "student-a",
  linkedAt: new Date("2026-06-01T08:00:00Z"),
};

describe("toParentStudentLink", () => {
  it("turns linkedAt into an ISO string", () => {
    expect(toParentStudentLink(row).linkedAt).toBe("2026-06-01T08:00:00.000Z");
  });

  it("round-trips through toParentStudentLinkData", () => {
    const link = toParentStudentLink(row);
    expect(toParentStudentLinkData(link).linkedAt).toEqual(row.linkedAt);
  });
});
