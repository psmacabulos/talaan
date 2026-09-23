import type { z } from "zod";
import type { createSchoolSchema, notificationPreferenceSchema, schoolSchema, schoolThemeSchema } from "./schemas";

export type SchoolTheme = z.infer<typeof schoolThemeSchema>;
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;
export type School = z.infer<typeof schoolSchema>;
/** What the add-school form's fields hold (React Hook Form's own generic). */
export type CreateSchoolFormValues = z.input<typeof createSchoolSchema>;
/** What a validated submission — and `createSchool` — actually works with. */
export type CreateSchoolFormInput = z.infer<typeof createSchoolSchema>;

/** A schools-list row: the school itself plus counts pulled from the other repositories for its list columns. */
export type SchoolRow = {
  school: School;
  studentCount: number;
  staffCount: number;
};
