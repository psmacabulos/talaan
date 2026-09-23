import type { z } from "zod";
import type {
  notificationKindSchema,
  notificationSchema,
  parentSchema,
  parentStudentLinkSchema,
} from "./schemas";

export type Parent = z.infer<typeof parentSchema>;
export type ParentStudentLink = z.infer<typeof parentStudentLinkSchema>;
export type NotificationKind = z.infer<typeof notificationKindSchema>;
export type Notification = z.infer<typeof notificationSchema>;
