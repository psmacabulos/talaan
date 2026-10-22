import type { FeedNotification, Notification, ParentName } from "./types";
import type { Student } from "../students/types";

/**
 * A notification joined with the child it's about, ready to render. Only
 * the child's name goes with it: the bell and the feed are client
 * components, so whatever is here reaches the browser (Step 53.2). A link
 * notice's `aboutParent` is the one thing of another parent's that does
 * (Step 55.2).
 */
export type ParentNotificationItem = {
  notification: FeedNotification;
  student: Pick<Student, "id" | "firstName" | "lastName">;
};

/**
 * What follows the child's name in the bell and in a push, e.g. "tapped in"
 * — sentence case, matching the app's copy style. A `switch` with no
 * default: a new kind that isn't handled here is a compile error.
 */
export function notificationKindLabel(kind: Notification["kind"]): string {
  switch (kind) {
    case "time_in":
      return "tapped in";
    case "time_out":
      return "tapped out";
    case "guardian_linked":
      return "has a new parent account linked";
  }
}

/** The second sentence of every link notice in the feed (Step 55.2). */
export const LINK_NOTICE_ADVICE = "If you don't know them, contact the school.";

/**
 * Who linked, as the feed says it: "An account named Ana Santos", since
 * sign-up checks nothing about a name; "A parent account" once that account
 * is deleted.
 */
export function linkedBy(aboutParent: ParentName | null): { lead: string; name: string | null } {
  return aboutParent
    ? { lead: "An account named", name: `${aboutParent.firstName} ${aboutParent.lastName}` }
    : { lead: "A parent account", name: null };
}
