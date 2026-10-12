import { z } from "zod";

/** The staff sign-in form, checked in the browser and again by `signIn` (src/features/auth/actions.ts). */
export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
