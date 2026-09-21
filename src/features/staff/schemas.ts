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
