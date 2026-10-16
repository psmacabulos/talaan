import { z } from "zod";
import { emailSchema, passwordSchema } from "@/features/auth/schemas";
import { lrnSchema, phMobileSchema } from "@/features/students/schemas";

/**
 * Step 22's signup. No school (Step 53): one account covers children at any
 * number of schools, and "link a child" asks for each child's school.
 */
export const parentSignupSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter a first name"),
    lastName: z.string().trim().min(1, "Enter a last name"),
    mobile: phMobileSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const parentLoginSchema = z.object({
  email: emailSchema,
  // No stored password is longer, and each try is hashed, so a longer one is refused unhashed.
  password: z.string().min(1, "Enter your password").max(128, "Enter your password"),
});

/**
 * "Link a child" (CLAUDE.md's domain rules): the child's school (Step 53),
 * then the three details a parent already has on hand and that uniquely
 * identify a student there — no link code to distribute.
 */
export const linkChildSchema = z.object({
  schoolId: z.string().min(1, "Select your child's school"),
  lrn: lrnSchema,
  lastName: z.string().trim().min(1, "Enter your child's last name"),
  birthDate: z.iso.date("Enter your child's birth date"),
});
