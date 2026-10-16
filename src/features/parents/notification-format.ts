import { Notification } from "./types";
import type { Student } from "../students/types";

/**
 * A notification joined with the child it's about, ready to render. Only
 * the child's name goes with it: the bell and the feed are client
 * components, so whatever is here reaches the browser (Step 53.2).
 */
export type ParentNotificationItem = {
  notification: Notification;
  student: Pick<Student, "id" | "firstName" | "lastName">;
};

/** The plain-language verb a parent reads, e.g. "tapped in" — sentence case, matching the app's copy style. */

export function notificationKindLabel(kind: Notification["kind"]): string {
  return kind === "time_in" ? "tapped in" : "tapped out";
}
