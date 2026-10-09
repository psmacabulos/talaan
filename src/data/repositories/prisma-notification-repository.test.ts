import { describe, expect, it } from "vitest";
import type { Notification as NotificationRow } from "@/generated/prisma/client";
import { toNotification, toNotificationData } from "./prisma-notification-repository";

const row: NotificationRow = {
  id: "notification-a",
  schoolId: "school-a",
  studentId: "student-a",
  kind: "time_out",
  tappedAt: new Date("2026-06-20T16:05:00Z"),
  read: false,
  createdAt: new Date("2026-06-20T16:05:01Z"),
};

describe("toNotification", () => {
  it("turns a row into the app's Notification, dropping createdAt", () => {
    expect(toNotification(row)).toEqual({
      id: "notification-a",
      schoolId: "school-a",
      studentId: "student-a",
      kind: "time_out",
      tappedAt: "2026-06-20T16:05:00.000Z",
      read: false,
    });
  });

  it("round-trips the tap time through toNotificationData", () => {
    expect(toNotificationData(toNotification(row)).tappedAt).toEqual(row.tappedAt);
  });
});
