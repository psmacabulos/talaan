import { z } from "zod";
import { phMobileSchema } from "@/features/students/schemas";

/**
 * A parent (guardian) account. Phase 1 has no real auth yet (parent
 * signup/login is Step 22) — this is just the domain record a parent's
 * future account is built on. Separate from `Student.guardianName` /
 * `guardianMobile`, which stay as a plain contact fallback for a guardian
 * who never creates an account (CLAUDE.md's domain rules). A parent belongs
 * to no school (Step 53): each linked child carries its own, so one account
 * covers children at any number of schools.
 */
export const parentSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1, "Enter a first name"),
  lastName: z.string().min(1, "Enter a last name"),
  mobile: phMobileSchema,
  email: z.email(),
});

/**
 * The many-to-many join between a parent and a student — a parent can have
 * several children at the school, and a child can have several linked
 * guardians (a mother and father both notified). `schoolId` is the child's
 * school, saved when the parent's details matched a student there; every
 * parent read uses it (Step 53).
 */
export const parentStudentLinkSchema = z.object({
  id: z.string().min(1),
  schoolId: z.string().min(1),
  parentId: z.string().min(1),
  studentId: z.string().min(1),
  linkedAt: z.iso.datetime(),
});

/**
 * A tap's direction, and the kind of a tap's notification: a student
 * arriving (time in) or leaving (time out). A school's
 * `notificationPreference` (`off` / `time_in_only` / `time_in_and_time_out`,
 * see schools/schemas.ts) decides which of these actually fire, per school —
 * never per parent.
 */
export const notificationKindSchema = z.enum(["time_in", "time_out"]);

const notificationBase = {
  id: z.string().min(1),
  schoolId: z.string().min(1),
  studentId: z.string().min(1),
  /** When it happened: the tap's time, or the link's. */
  tappedAt: z.iso.datetime(),
  read: z.boolean(),
};

/**
 * A notification a parent sees in their in-app feed (Step 24), one of two
 * kinds, told apart by `kind`:
 *
 * - **A tap** (`time_in`/`time_out`): a flat copy of the tap's data at the
 *   moment it fires, rather than a reference to the tap. One row per child:
 *   every guardian of the child sees it and shares its read mark, so it has
 *   no recipient.
 * - **A new guardian linked** (`guardian_linked`, Step 55.2): one row for
 *   each guardian who's told, so it has exactly one recipient, and names the
 *   parent who linked (`aboutParentId`, empty once that account is deleted).
 *
 * A union, so code that shows a notification has to handle both kinds; a
 * missing one is a compile error, not a wrong word on a parent's phone.
 */
export const notificationSchema = z.discriminatedUnion("kind", [
  z.object({ ...notificationBase, kind: notificationKindSchema, recipientParentId: z.null() }),
  z.object({
    ...notificationBase,
    kind: z.literal("guardian_linked"),
    recipientParentId: z.string().min(1),
    aboutParentId: z.string().min(1).nullable(),
  }),
]);
