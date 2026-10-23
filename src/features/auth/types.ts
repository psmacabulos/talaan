import type { z } from "zod";
import type { forgotPasswordSchema, loginSchema, setPasswordSchema } from "./schemas";

export type LoginInput = z.infer<typeof loginSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
/** What the form's field holds; the schema trims and lowercases it. */
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
