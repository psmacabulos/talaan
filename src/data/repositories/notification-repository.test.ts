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

  it("lists a student's notifications", async () => {
    const repo = createMockNotificationRepository(allNotifications, { latencyMs: 0 });
    await expect(repo.listByStudent("school-a", "student-a")).resolves.toEqual([notifA]);
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
    await expect(repo.listByStudent("school-a", "student-a")).resolves.toEqual([notifA, created]);
  });

  it("marks a notification read", async () => {
    const repo = createMockNotificationRepository(allNotifications, { latencyMs: 0 });
    const marked = await repo.markRead("school-a", "notification-a");
    expect(marked).toEqual({ ...notifA, read: true });
    await expect(repo.getInSchool("school-a", "notification-a")).resolves.toEqual({ ...notifA, read: true });
  });

  it("never reaches another school's notifications (Step 51)", async () => {
    const repo = createMockNotificationRepository([...allNotifications], { latencyMs: 0 });
    await expect(repo.getInSchool("school-b", "notification-a")).resolves.toBeNull();
    await expect(repo.listByStudent("school-b", "student-a")).resolves.toEqual([]);
    await expect(repo.markRead("school-b", "notification-a")).resolves.toBeNull();
    // Its own school still finds it (an earlier test may have marked it read).
    await expect(repo.getInSchool("school-a", "notification-a")).resolves.toMatchObject({ id: "notification-a" });
  });

  it("returns null when marking an unknown id", async () => {
    const repo = createMockNotificationRepository(allNotifications, { latencyMs: 0 });
    await expect(repo.markRead("school-a", "nope")).resolves.toBeNull();
  });
});
