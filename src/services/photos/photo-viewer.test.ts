import { describe, expect, it } from "vitest";
import { createMockParentStudentLinkRepository } from "@/data/repositories/parent-student-link-repository";
import { createMockParentTokenRepository } from "@/data/repositories/parent-token-repository";
import { issueParentToken } from "@/services/parents/parent-token";
import { canViewPhoto, parentPhotoViewer, webParentPhotoViewer } from "./photo-viewer";

const KEY = "school-balanga/student-0001/k3x9q2ab.webp";
const NOW = "2026-10-16T00:00:00.000Z";

describe("canViewPhoto", () => {
  it("shows a photo to its own school only", () => {
    expect(canViewPhoto(KEY, { schoolId: "school-balanga" })).toBe(true);
    expect(canViewPhoto(KEY, { schoolId: "school-oceanview" })).toBe(false);
  });

  it("shows every school's photos to a super admin, and nothing to nobody", () => {
    expect(canViewPhoto(KEY, { allSchools: true })).toBe(true);
    expect(canViewPhoto(KEY, null)).toBe(false);
  });

  it("shows a parent their own child's photos, and no other child's", () => {
    const parent = { children: [{ schoolId: "school-balanga", studentId: "student-0001" }] };
    expect(canViewPhoto(KEY, parent)).toBe(true);
    expect(canViewPhoto("school-balanga/student-0001/an-older-one.jpeg", parent)).toBe(true);
    // A classmate at the same school.
    expect(canViewPhoto("school-balanga/student-0002/k3x9q2ab.webp", parent)).toBe(false);
    // The same student id under another school.
    expect(canViewPhoto("school-oceanview/student-0001/k3x9q2ab.webp", parent)).toBe(false);
    expect(canViewPhoto(KEY, { children: [] })).toBe(false);
  });
});

function linksOfParent1() {
  return createMockParentStudentLinkRepository(
    [
      {
        id: "link-1",
        schoolId: "school-balanga",
        parentId: "parent-1",
        studentId: "student-0001",
        linkedAt: "2026-06-01T00:00:00.000Z",
      },
    ],
    { latencyMs: 0 },
  );
}

describe("parentPhotoViewer", () => {
  it("is the parent's linked children for a working token, and nobody for any other", async () => {
    const tokens = createMockParentTokenRepository();
    const links = linksOfParent1();
    const token = await issueParentToken("parent-1", null, NOW, { tokens });

    await expect(parentPhotoViewer(`Bearer ${token}`, NOW, { tokens, links })).resolves.toEqual({
      children: [{ schoolId: "school-balanga", studentId: "student-0001" }],
    });
    await expect(parentPhotoViewer("Bearer tal_par_made-up", NOW, { tokens, links })).resolves.toBeNull();
  });
});

describe("webParentPhotoViewer", () => {
  it("is the signed-in parent's linked children, and nobody when no parent is signed in", async () => {
    const links = linksOfParent1();

    await expect(webParentPhotoViewer({ session: async () => ({ parentId: "parent-1" }), links })).resolves.toEqual({
      children: [{ schoolId: "school-balanga", studentId: "student-0001" }],
    });
    await expect(webParentPhotoViewer({ session: async () => null, links })).resolves.toBeNull();
  });
});
