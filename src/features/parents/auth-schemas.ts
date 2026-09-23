import { z } from "zod";
import { lrnSchema, phMobileSchema } from "@/features/students/schemas";

/**
 * Phase 1's mock parent repository stores this as plain text (see
 * data/repositories/parent-repository.ts's own comment) — real hashing
 * arrives with Auth.js in Phase 2 (CLAUDE.md). Still a real minimum-length
 * check so the form behaves like the eventual real one.
 */
export const parentPasswordSchema = z.string().min(8, "Use at least 8 characters");

/**
 * Step 22's signup. A parent picks their child's school here, from a plain
 * dropdown of names (no logos) — the one pre-session screen where asking
 * "which school" is the parent's own active choice, not the app defaulting
 * to a single school's branding (CLAUDE.md's multi-tenant rule is about the
 * app never assuming a school, not about never asking). Fixing the school
 * at signup means "link a child" only ever has to search within it.
 */
export const parentSignupSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter a first name"),
    lastName: z.string().trim().min(1, "Enter a last name"),
    mobile: phMobileSchema,
    email: z.email("Enter a valid email address"),
    schoolId: z.string().min(1, "Select your child's school"),
    password: parentPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const parentLoginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

/**
 * "Link a child" (CLAUDE.md's domain rules): the three details a parent
 * already has on hand and that uniquely identify a student at their
 * school — no link code to distribute.
 */
export const linkChildSchema = z.object({
  lrn: lrnSchema,
  lastName: z.string().trim().min(1, "Enter your child's last name"),
  birthDate: z.iso.date("Enter your child's birth date"),
});
