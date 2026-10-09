import { Notification } from "./types";
import type { Student } from "../students/types";

/** A notification joined with the child it's about, ready to render. */

export type ParentNotificationItem = {
  notification: Notification;
  student: Student;
};

export function countUnreadNotifications(items: ParentNotificationItem[]): number {
  return items.filter((item) => !item.notification.read).length;
}

/** The plain-language verb a parent reads, e.g. "tapped in" — sentence case, matching the app's copy style. */

export function notificationKindLabel(kind: Notification["kind"]): string {
  return kind === "time_in" ? "tapped in" : "tapped out";
}
