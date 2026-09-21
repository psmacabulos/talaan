import type { z } from "zod";
import type { loginSchema } from "./schemas";

export type LoginInput = z.infer<typeof loginSchema>;
