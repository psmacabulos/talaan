import { z } from "zod";
import { gradeLevelSchema } from "@/features/students/schemas";

/**
 * super_admin: all schools. principal: one school, full access. teacher:
 * read-only, own advisory class. See CLAUDE.md's domain rules.
 */
export const roleSchema = z.enum(["super_admin", "principal", "teacher"]);

/** "invited" is what Step 18's staff invite flow creates before someone signs in. */
export const staffStatusSchema = z.enum(["active", "invited"]);

export const staffSchema = z
  .object({
    id: z.string().min(1),
    // Every super_admin is global (not scoped to one school) — every other
    // role must belong to exactly one school. See the .refine() below.
    schoolId: z.string().min(1).nullable(),
    role: roleSchema,
    firstName: z.string().min(1, "Enter a first name"),
    lastName: z.string().min(1, "Enter a last name"),
    email: z.email(),
    status: staffStatusSchema,
    // A teacher's own advisory class (read-only elsewhere in the app).
    advisoryGradeLevel: gradeLevelSchema.optional(),
    advisorySection: z.string().min(1).optional(),
  })
  .refine((staff) => staff.role === "super_admin" || staff.schoolId !== null, {
    message: "Only a super admin can have no school",
    path: ["schoolId"],
  })
  .refine((staff) => staff.role !== "super_admin" || staff.schoolId === null, {
    message: "A super admin isn't scoped to a single school",
    path: ["schoolId"],
  });

/** Who a principal or super admin can actually invite from a school's Staff page — a super admin account isn't a school-scoped invite. */
export const staffInviteRoleSchema = z.enum(["principal", "teacher"]);

/**
 * Step 18's invite drawer. Unlike `staffSchema`, `id`/`schoolId`/`status`
 * are assigned by the server action, not the form — a fresh invite is
 * always "invited" at a school taken from the signed-in session, never
 * something the form itself could set. Advisory grade/section are only
 * meaningful for a teacher; the form only shows them for that role, and
 * they're optional here too — an invited teacher can have their advisory
 * class assigned later.
 */
export const staffFormSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name"),
  lastName: z.string().trim().min(1, "Enter a last name"),
  email: z.email("Enter a valid email address"),
  role: staffInviteRoleSchema,
  advisoryGradeLevel: gradeLevelSchema.optional(),
  advisorySection: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
});
