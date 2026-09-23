import { z } from "zod";
import { phMobileSchema } from "@/features/students/schemas";

/**
 * A parent (guardian) account. Phase 1 has no real auth yet (parent
 * signup/login is Step 22) — this is just the domain record a parent's
 * future account is built on. Separate from `Student.guardianName` /
 * `guardianMobile`, which stay as a plain contact fallback for a guardian
 * who never creates an account (CLAUDE.md's domain rules). One parent
 * belongs to exactly one school; there is no cross-school parent.
 */
export const parentSchema = z.object({
  id: z.string().min(1),
  schoolId: z.string().min(1),
  firstName: z.string().min(1, "Enter a first name"),
  lastName: z.string().min(1, "Enter a last name"),
  mobile: phMobileSchema,
  email: z.email(),
});

/**
 * The many-to-many join between a parent and a student — a parent can have
 * several children at the school, and a child can have several linked
 * guardians (a mother and father both notified). Because a parent is scoped
 * to one school, both sides of any link always share the same `schoolId`.
 */
export const parentStudentLinkSchema = z.object({
  id: z.string().min(1),
  schoolId: z.string().min(1),
  parentId: z.string().min(1),
  studentId: z.string().min(1),
  linkedAt: z.iso.datetime(),
});

/**
 * Whether a notification is for a student arriving (time in) or leaving
 * (time out). A school's `notificationPreference` (`off` / `time_in_only` /
 * `time_in_and_time_out`, see schools/schemas.ts) decides which of these
 * actually fire, per school — never per parent.
 */
export const notificationKindSchema = z.enum(["time_in", "time_out"]);

/**
 * A notification a parent sees in their in-app feed (Step 24). Stored as a
 * flat copy of the tap's data at the moment it fires — `studentId` and
 * `tappedAt` are copied from the tap, `kind` is derived from the tap
 * sequence — rather than referencing the tap by `id`. That's a deliberate
 * deferral (a `tapId` foreign key can be added in Phase 2 once there's a
 * real Tap API to join against), not an oversight.
 */
export const notificationSchema = z.object({
  id: z.string().min(1),
  schoolId: z.string().min(1),
  studentId: z.string().min(1),
  kind: notificationKindSchema,
  tappedAt: z.iso.datetime(),
  read: z.boolean(),
});
