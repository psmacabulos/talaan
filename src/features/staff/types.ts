import type { z } from "zod";
import type { roleSchema, staffFormSchema, staffInviteRoleSchema, staffSchema, staffStatusSchema } from "./schemas";

export type Role = z.infer<typeof roleSchema>;
export type StaffStatus = z.infer<typeof staffStatusSchema>;
export type Staff = z.infer<typeof staffSchema>;
export type StaffInviteRole = z.infer<typeof staffInviteRoleSchema>;
/** What the invite form's fields hold (React Hook Form's own generic). */
export type StaffFormValues = z.input<typeof staffFormSchema>;
/** What a validated submission — and `inviteStaff` — actually works with. */
export type StaffFormInput = z.infer<typeof staffFormSchema>;
