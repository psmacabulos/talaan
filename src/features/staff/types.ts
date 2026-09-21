import type { z } from "zod";
import type { roleSchema, staffSchema, staffStatusSchema } from "./schemas";

export type Role = z.infer<typeof roleSchema>;
export type StaffStatus = z.infer<typeof staffStatusSchema>;
export type Staff = z.infer<typeof staffSchema>;
