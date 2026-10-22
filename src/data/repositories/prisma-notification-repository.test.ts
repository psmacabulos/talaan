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
  recipientParentId: null,
  aboutParentId: null,
  createdAt: new Date("2026-06-20T16:05:01Z"),
  pushedAt: null,
};

/** Step 55.2: a new guardian linked student-a, for parent-a only. */
const noticeRow: NotificationRow = {
  ...row,
  id: "notice-a",
  kind: "guardian_linked",
  recipientParentId: "parent-a",
  aboutParentId: "parent-new",
};

describe("toNotification", () => {
  it("turns a row into the app's Notification, dropping createdAt and pushedAt", () => {
    expect(toNotification(row)).toEqual({
      id: "notification-a",
      schoolId: "school-a",
      studentId: "student-a",
      kind: "time_out",
      tappedAt: "2026-06-20T16:05:00.000Z",
      read: false,
      recipientParentId: null,
    });
  });

  it("round-trips the tap time through toNotificationData", () => {
    expect(toNotificationData(toNotification(row)).tappedAt).toEqual(row.tappedAt);
  });

  it("keeps a link notice's recipient and linking parent, both ways (Step 55.2)", () => {
    const notice = toNotification(noticeRow);
    expect(notice).toMatchObject({
      kind: "guardian_linked",
      recipientParentId: "parent-a",
      aboutParentId: "parent-new",
    });
    expect(toNotificationData(notice)).toMatchObject({ recipientParentId: "parent-a", aboutParentId: "parent-new" });
  });

  it("refuses a tap's notification with a recipient, and a link notice without one", () => {
    expect(() => toNotification({ ...row, recipientParentId: "parent-a" })).toThrow();
    expect(() => toNotification({ ...noticeRow, recipientParentId: null })).toThrow();
  });
});
