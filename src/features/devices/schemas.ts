import { z } from "zod";
import { DEVICE_NAME_MAX_LENGTH } from "./names";

/** A gate station (`/gate`, records taps) or a guardhouse monitor (`/gate/display`, only watches). */
export const deviceKindSchema = z.enum(["gate", "monitor"]);

/** A revoked device's token stops working at once; its row stays so old taps still name it. */
export const deviceStatusSchema = z.enum(["active", "revoked"]);

/**
 * A physical device a school owns. It signs in with its own token, never a
 * staff login. The token's hash is deliberately not part of this type: it
 * stays inside the repository, the same way a parent's password hash does.
 */
export const deviceSchema = z.object({
  id: z.string().min(1),
  schoolId: z.string().min(1),
  label: z.string().trim().min(1, "Enter a label"),
  kind: deviceKindSchema,
  status: deviceStatusSchema,
  lastSeenAt: z.iso.datetime().nullable(),
});

/** The Add gate and Add monitor forms (Step 59.13), checked in the browser and again on the server. */
export const deviceFormSchema = z.object({
  kind: deviceKindSchema,
  label: z
    .string()
    .trim()
    .min(1, "Enter a name for this device")
    .max(DEVICE_NAME_MAX_LENGTH, `Use ${DEVICE_NAME_MAX_LENGTH} characters or fewer`),
});

export type DeviceFormInput = z.infer<typeof deviceFormSchema>;
