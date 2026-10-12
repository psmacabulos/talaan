import type { z } from "zod";
import type { loginSchema, setPasswordSchema } from "./schemas";

export type LoginInput = z.infer<typeof loginSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
