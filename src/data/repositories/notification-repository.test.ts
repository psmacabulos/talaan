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
    await expect(repo.listByStudent("student-a")).resolves.toEqual([notifA]);
  });

  it("gets a notification by id", async () => {
    const repo = createMockNotificationRepository(allNotifications, { latencyMs: 0 });
    await expect(repo.getById("notification-b")).resolves.toEqual(notifB);
  });

  it("returns null for an unknown id", async () => {
    const repo = createMockNotificationRepository(allNotifications, { latencyMs: 0 });
    await expect(repo.getById("nope")).resolves.toBeNull();
  });
});
