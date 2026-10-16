import { z } from "zod";

/** The staff sign-in form, checked in the browser and again by `signIn` (src/features/auth/actions.ts). */
export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

/** How a parent's email is stored and looked up (Step 53.1): no spaces around it, all lower case. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * An email field that normalises before it checks, so " Ana@X.com " is
 * accepted as "ana@x.com". The order matters: in Zod 4, `z.email()` runs
 * before anything chained after it, so `z.email().trim()` would reject the
 * spaces first.
 */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

/** Every password the app stores, staff or parent: at least 8 characters. */
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
