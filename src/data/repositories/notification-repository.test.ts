import { describe, expect, it } from "vitest";
import type { Notification } from "@/features/parents/types";
import { createMockNotificationRepository } from "./notification-repository";

const notifA: Notification = {
  id: "notification-a",
  schoolId: "school-a",
  studentId: "student-a",
  kind: "time_in",
  tappedAt: "2026-06-20T07:56:00Z",
  read: false,
};

const notifB: Notification = {
  id: "notification-b",
  schoolId: "school-a",
  studentId: "student-b",
  kind: "time_out",
  tappedAt: "2026-06-20T16:05:00Z",
  read: true,
};

const notifOtherSchool: Notification = {
  id: "notification-c",
  schoolId: "school-b",
  studentId: "student-c",
  kind: "time_in",
  tappedAt: "2026-06-20T07:57:00Z",
  read: false,
};

const allNotifications = [notifA, notifB, notifOtherSchool];

describe("createMockNotificationRepository", () => {
  it("lists only a given school's notifications", async () => {
    const repo = createMockNotificationRepository(allNotifications, { latencyMs: 0 });
    await expect(repo.listBySchool("school-a")).resolves.toEqual([notifA, notifB]);
  });

  it("pages a student's notifications newest first, the id breaking a tie", async () => {
    const at = "2026-06-20T07:00:00.000Z";
    const rows: Notification[] = ["n-1", "n-3", "n-2"].map((id) => ({ ...notifA, id, tappedAt: at }));
    const later = { ...notifA, id: "n-0", tappedAt: "2026-06-20T08:00:00.000Z" };
    const repo = createMockNotificationRepository([...rows, later], { latencyMs: 0 });

    const first = await repo.listPageForStudent("school-a", "student-a", { before: null, take: 2 });
    expect(first.map((notification) => notification.id)).toEqual(["n-0", "n-3"]);
    const next = await repo.listPageForStudent("school-a", "student-a", { before: first[1], take: 2 });
    expect(next.map((notification) => notification.id)).toEqual(["n-2", "n-1"]);
  });

  it("counts a student's unread notifications, no further than the cap", async () => {
    const unread = Array.from({ length: 4 }, (_, index) => ({ ...notifA, id: `n-${index}` }));
    const repo = createMockNotificationRepository([...unread, { ...notifA, id: "n-read", read: true }], {
      latencyMs: 0,
    });
    await expect(repo.countUnreadForStudent("school-a", "student-a", 10)).resolves.toBe(4);
    await expect(repo.countUnreadForStudent("school-a", "student-a", 3)).resolves.toBe(3);
  });

  it("gets a notification by id", async () => {
    const repo = createMockNotificationRepository(allNotifications, { latencyMs: 0 });
    await expect(repo.getInSchool("school-a", "notification-b")).resolves.toEqual(notifB);
  });

  it("returns null for an unknown id", async () => {
    const repo = createMockNotificationRepository(allNotifications, { latencyMs: 0 });
    await expect(repo.getInSchool("school-a", "nope")).resolves.toBeNull();
  });

  it("appends a created notification", async () => {
    const repo = createMockNotificationRepository(allNotifications, { latencyMs: 0 });
    const created: Notification = {
      id: "notification-d",
      schoolId: "school-a",
      studentId: "student-a",
      kind: "time_in",
      tappedAt: "2026-06-20T09:15:00Z",
      read: false,
    };
    await expect(repo.create(created)).resolves.toEqual(created);
    await expect(repo.listBySchool("school-a")).resolves.toEqual([notifA, notifB, created]);
  });

  it("is idempotent by id, like a real station's replayed tap", async () => {
    const repo = createMockNotificationRepository(allNotifications, { latencyMs: 0 });
    const created: Notification = {
      id: "notification-d",
      schoolId: "school-a",
      studentId: "student-a",
      kind: "time_in",
      tappedAt: "2026-06-20T09:15:00Z",
      read: false,
    };
    await repo.create(created);
    await repo.create(created);
    await expect(repo.listBySchool("school-a")).resolves.toEqual([notifA, notifB, created]);
  });

  it("marks a notification read for one of the given children, and says so", async () => {
    const repo = createMockNotificationRepository([...allNotifications], { latencyMs: 0 });
    const child = { schoolId: "school-a", studentId: "student-a" };
    await expect(repo.markReadForChildren([child], "notification-a")).resolves.toBe(true);
    await expect(repo.getInSchool("school-a", "notification-a")).resolves.toEqual({ ...notifA, read: true });
    // Already read is still theirs.
    await expect(repo.markReadForChildren([child], "notification-a")).resolves.toBe(true);
  });

  it("marks every unread notification of the given children read, and no one else's", async () => {
    const repo = createMockNotificationRepository([...allNotifications], { latencyMs: 0 });
    await repo.markAllReadForChildren([{ schoolId: "school-a", studentId: "student-a" }]);
    await expect(repo.getInSchool("school-a", "notification-a")).resolves.toMatchObject({ read: true });
    await expect(repo.getInSchool("school-b", "notification-c")).resolves.toMatchObject({ read: false });
  });

  it("never reaches another school's notifications (Step 51)", async () => {
    const repo = createMockNotificationRepository([...allNotifications], { latencyMs: 0 });
    await expect(repo.getInSchool("school-b", "notification-a")).resolves.toBeNull();
    await expect(repo.listPageForStudent("school-b", "student-a", { before: null, take: 10 })).resolves.toEqual([]);
    await expect(repo.countUnreadForStudent("school-b", "student-a", 10)).resolves.toBe(0);
    // The right student at the wrong school is not that child.
    await expect(
      repo.markReadForChildren([{ schoolId: "school-b", studentId: "student-a" }], "notification-a"),
    ).resolves.toBe(false);
    // Its own school still finds it (an earlier test may have marked it read).
    await expect(repo.getInSchool("school-a", "notification-a")).resolves.toMatchObject({ id: "notification-a" });
  });

  it("says false when marking an unknown id", async () => {
    const repo = createMockNotificationRepository(allNotifications, { latencyMs: 0 });
    await expect(repo.markReadForChildren([{ schoolId: "school-a", studentId: "student-a" }], "nope")).resolves.toBe(
      false,
    );
  });
});
