import { z } from "zod";

/** The staff sign-in form, checked in the browser and again by `signIn` (src/features/auth/actions.ts). */
export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

/** Every password Talaan stores, staff or parent: at least 8 characters. */
export const passwordSchema = z.string().min(8, "Use at least 8 characters");

/** Step 50.5's set-password page: a new password, typed twice. */
export const setPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
