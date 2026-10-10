import type { z } from "zod";
import type { deviceKindSchema, deviceSchema } from "./schemas";

export type Device = z.infer<typeof deviceSchema>;
export type DeviceKind = z.infer<typeof deviceKindSchema>;
