import type { z } from "zod";
import type { notificationKindSchema, notificationSchema, parentSchema, parentStudentLinkSchema } from "./schemas";
import type { linkChildSchema, parentLoginSchema, parentResetPasswordSchema, parentSignupSchema } from "./auth-schemas";
import type { Student } from "../students/types";

export type Parent = z.infer<typeof parentSchema>;
export type ParentStudentLink = z.infer<typeof parentStudentLinkSchema>;
export type NotificationKind = z.infer<typeof notificationKindSchema>;
export type Notification = z.infer<typeof notificationSchema>;
/** A tap's notification, for every guardian of the child. */
export type TapNotification = Extract<Notification, { recipientParentId: null }>;
/** Step 55.2's "a new guardian linked", for one parent. */
export type LinkNotification = Extract<Notification, { kind: "guardian_linked" }>;
/** Just a parent's name: all a link notice shows of the parent who linked. */
export type ParentName = Pick<Parent, "firstName" | "lastName">;
/**
 * A notification as a parent's feed reads it: with the name of the parent
 * who linked, for a link notice (null for a tap, or once that account is
 * deleted). Writing one takes a plain `Notification`.
 */
export type FeedNotification = Notification & { aboutParent: ParentName | null };

/** Step 22's signup, sign-in and link-a-child forms. The email is trimmed and lowercased (Step 53.1), but it's a string before and after, so (unlike `StudentFormValues`/`StudentFormInput`) one inferred type each is enough for both the form and the server action. */
export type ParentSignupInput = z.infer<typeof parentSignupSchema>;
export type ParentLoginInput = z.infer<typeof parentLoginSchema>;
export type LinkChildInput = z.infer<typeof linkChildSchema>;
/** Step 55.6's code-and-new-password screen. */
export type ParentResetPasswordInput = z.infer<typeof parentResetPasswordSchema>;

/** A parent account linked to a child, as the school sees it (Step 55.3). Never the parent's email. */
export type LinkedGuardian = {
  linkId: string;
  studentId: string;
  linkedAt: string;
  parent: Pick<Parent, "firstName" | "lastName" | "mobile">;
};

/** One of a school's newest links, for the dashboard (Step 55.3). */
export type RecentLink = {
  linkId: string;
  linkedAt: string;
  parent: ParentName;
  student: Pick<Student, "id" | "firstName" | "lastName">;
};

/** A parent the school removed from a child (Step 55.4), for the drawer's "Removed" list. */
export type RemovedGuardian = {
  blockId: string;
  studentId: string;
  removedAt: string;
  parent: ParentName;
  /** Null once that staff member is removed: "by a former staff member". */
  removedBy: { firstName: string; lastName: string } | null;
};
