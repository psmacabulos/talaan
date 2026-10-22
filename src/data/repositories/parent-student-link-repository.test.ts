import { describe, expect, it } from "vitest";
import type { Notification, ParentStudentLink } from "@/features/parents/types";
import type { Student } from "@/features/students/types";
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

const studentBase: Student = {
  id: "student-x",
  schoolId: "school-a",
  firstName: "X",
  lastName: "Y",
  birthDate: "2012-03-14",
  gradeLevel: 8,
  section: "Rizal",
  guardianName: "Maria Cruz",
  guardianMobile: "09171234567",
};

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

  describe("the school's view of its links (Step 55.3)", () => {
    const parents = [
      { id: "parent-a", firstName: "Ana", lastName: "Santos", mobile: "09170000001", email: "ana@x.com" },
      { id: "parent-b", firstName: "Ben", lastName: "Reyes", mobile: "09170000002", email: "ben@x.com" },
    ];
    const students = [
      { ...studentBase, id: "student-a", firstName: "Juan", lastName: "Cruz" },
      { ...studentBase, id: "student-b", firstName: "Maria", lastName: "Ramos" },
    ];
    const elsewhere = { ...link3, id: "link-elsewhere", schoolId: "school-b", linkedAt: "2026-06-03T08:00:00Z" };
    const later = { ...link3, linkedAt: "2026-06-02T08:00:00Z" };
    const repo = () =>
      createMockParentStudentLinkRepository([later, link2, link1, elsewhere], {
        latencyMs: 0,
        notifications: [],
        parents,
        students,
      });

    it("lists the asked students' parents at that school, oldest first, with name and mobile only", async () => {
      await expect(repo().listGuardiansInSchool("school-a", ["student-a"])).resolves.toEqual([
        {
          linkId: "link-1",
          studentId: "student-a",
          linkedAt: link1.linkedAt,
          parent: { firstName: "Ana", lastName: "Santos", mobile: "09170000001" },
        },
        {
          linkId: "link-3",
          studentId: "student-a",
          linkedAt: later.linkedAt,
          parent: { firstName: "Ben", lastName: "Reyes", mobile: "09170000002" },
        },
      ]);
      await expect(repo().listGuardiansInSchool("school-a", [])).resolves.toEqual([]);
      await expect(repo().listGuardiansInSchool("school-c", ["student-a"])).resolves.toEqual([]);
    });

    it("counts the school's links since a time, and lists the newest few with names", async () => {
      const recent = await repo().listRecentInSchool("school-a", "2026-06-01T08:00:00Z", 1);
      expect(recent.total).toBe(3);
      expect(recent.links).toEqual([
        {
          linkId: "link-3",
          linkedAt: later.linkedAt,
          parent: { firstName: "Ben", lastName: "Reyes" },
          student: { id: "student-a", firstName: "Juan", lastName: "Cruz" },
        },
      ]);
      await expect(repo().listRecentInSchool("school-a", "2026-06-02T00:00:00Z", 5)).resolves.toMatchObject({
        total: 1,
      });
    });
  });
});
