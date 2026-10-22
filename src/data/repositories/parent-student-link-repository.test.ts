import { describe, expect, it } from "vitest";
import type { Notification, ParentStudentLink } from "@/features/parents/types";
import { createMockParentStudentLinkRepository } from "./parent-student-link-repository";

const link1: ParentStudentLink = {
  id: "link-1",
  schoolId: "school-a",
  parentId: "parent-a",
  studentId: "student-a",
  linkedAt: "2026-06-01T08:00:00Z",
};

const link2: ParentStudentLink = {
  id: "link-2",
  schoolId: "school-a",
  parentId: "parent-a",
  studentId: "student-b",
  linkedAt: "2026-06-01T08:00:00Z",
};

const link3: ParentStudentLink = {
  id: "link-3",
  schoolId: "school-a",
  parentId: "parent-b",
  studentId: "student-a",
  linkedAt: "2026-06-01T08:00:00Z",
};

const allLinks = [link1, link2, link3];

describe("createMockParentStudentLinkRepository", () => {
  it("lists every child of a parent", async () => {
    const repo = createMockParentStudentLinkRepository(allLinks, { latencyMs: 0 });
    await expect(repo.listByParent("parent-a")).resolves.toEqual([link1, link2]);
  });

  it("lists every guardian of a student", async () => {
    const repo = createMockParentStudentLinkRepository(allLinks, { latencyMs: 0 });
    await expect(repo.listByStudent("student-a")).resolves.toEqual([link1, link3]);
  });

  it("lists every link within a school", async () => {
    const repo = createMockParentStudentLinkRepository(allLinks, { latencyMs: 0 });
    await expect(repo.listBySchool("school-a")).resolves.toEqual([link1, link2, link3]);
  });

  it("returns an empty list for an unknown parent or student", async () => {
    const repo = createMockParentStudentLinkRepository(allLinks, { latencyMs: 0 });
    await expect(repo.listByParent("nope")).resolves.toEqual([]);
    await expect(repo.listByStudent("nope")).resolves.toEqual([]);
  });

  it("creates a new link and it shows up for both sides", async () => {
    const repo = createMockParentStudentLinkRepository([], { latencyMs: 0, notifications: [] });
    await expect(repo.createWithNotices(link1)).resolves.toEqual({ link: link1, noticesMade: 0 });
    await expect(repo.listByParent("parent-a")).resolves.toEqual([link1]);
    await expect(repo.listByStudent("student-a")).resolves.toEqual([link1]);
  });

  it("returns null, and keeps the first, for an id that already exists", async () => {
    const repo = createMockParentStudentLinkRepository([link1], { latencyMs: 0, notifications: [] });
    await expect(repo.createWithNotices({ ...link1, studentId: "student-different" })).resolves.toBeNull();
    await expect(repo.listByParent("parent-a")).resolves.toEqual([link1]);
  });

  it("returns null for a second link between the same parent and student, and tells nobody", async () => {
    const notifications: Notification[] = [];
    const repo = createMockParentStudentLinkRepository([link1, link3], { latencyMs: 0, notifications });
    await expect(repo.createWithNotices({ ...link1, id: "link-twin" })).resolves.toBeNull();
    await expect(repo.listByParent(link1.parentId)).resolves.toEqual([link1]);
    expect(notifications).toEqual([]);
  });

  it("tells each of the child's other guardians at that school, about the new parent (Step 55.2)", async () => {
    const notifications: Notification[] = [];
    const elsewhere = { ...link3, id: "link-elsewhere", parentId: "parent-c", schoolId: "school-b" };
    const repo = createMockParentStudentLinkRepository([link1, link3, elsewhere], { latencyMs: 0, notifications });
    const link = { ...link1, id: "link-new", parentId: "parent-new" };

    await expect(repo.createWithNotices(link)).resolves.toEqual({ link, noticesMade: 2 });
    expect(notifications.map(({ recipientParentId }) => recipientParentId)).toEqual(["parent-a", "parent-b"]);
    expect(notifications[0]).toMatchObject({
      schoolId: "school-a",
      studentId: "student-a",
      kind: "guardian_linked",
      tappedAt: link.linkedAt,
      read: false,
      aboutParentId: "parent-new",
    });
  });
});
