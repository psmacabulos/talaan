import type { z } from "zod";
import type { notificationPreferenceSchema, schoolSchema, schoolThemeSchema } from "./schemas";

export type SchoolTheme = z.infer<typeof schoolThemeSchema>;
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;
export type School = z.infer<typeof schoolSchema>;
