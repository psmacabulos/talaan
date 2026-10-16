import type { z } from "zod";
import type { notificationKindSchema, notificationSchema, parentSchema, parentStudentLinkSchema } from "./schemas";
import type { linkChildSchema, parentLoginSchema, parentSignupSchema } from "./auth-schemas";

export type Parent = z.infer<typeof parentSchema>;
export type ParentStudentLink = z.infer<typeof parentStudentLinkSchema>;
export type NotificationKind = z.infer<typeof notificationKindSchema>;
export type Notification = z.infer<typeof notificationSchema>;

/** Step 22's signup, sign-in and link-a-child forms. The email is trimmed and lowercased (Step 53.1), but it's a string before and after, so (unlike `StudentFormValues`/`StudentFormInput`) one inferred type each is enough for both the form and the server action. */
export type ParentSignupInput = z.infer<typeof parentSignupSchema>;
export type ParentLoginInput = z.infer<typeof parentLoginSchema>;
export type LinkChildInput = z.infer<typeof linkChildSchema>;
