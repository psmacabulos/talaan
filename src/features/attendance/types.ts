import type { z } from "zod";
import type { alertSchema, alertTypeSchema, tapSchema } from "./schemas";

export type Tap = z.infer<typeof tapSchema>;
export type AlertType = z.infer<typeof alertTypeSchema>;
export type Alert = z.infer<typeof alertSchema>;
