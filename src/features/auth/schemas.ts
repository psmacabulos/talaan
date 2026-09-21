import { z } from "zod";

/**
 * Phase 1 has no real accounts to check this against — a valid submission
 * signs in as the demo principal, the same way the "Principal" shortcut
 * does (see login-form.tsx). Validation still runs for real, so the form
 * behaves like the eventual Phase 2 one.
 */
export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
