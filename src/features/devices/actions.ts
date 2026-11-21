"use server";

import { refresh } from "next/cache";
import { SIGNED_OUT_MESSAGE } from "@/features/auth/messages";
import { requestOrigin } from "@/lib/request-origin";
import { getSession } from "@/lib/session";
import { createDevice } from "@/services/devices/create-device";
import { DEVICE_LIMIT_MESSAGE, DEVICE_NAME_IN_USE_MESSAGE } from "./names";
import { deviceFormSchema, type DeviceFormInput } from "./schemas";
import type { DeviceKind } from "./types";

/**
 * What the dialog shows once, after a device is made (Step 59.13). `secret`
 * is the gate's key, or the monitor's finished link, built here so the
 * browser never assembles a credential. It is never stored (only its hash
 * is) and never written to a log, an error message or the page.
 */
export type AddDeviceResult =
  | { ok: true; kind: DeviceKind; label: string; secret: string; gatePage: string }
  | { ok: false; fieldError?: string; formError?: string };

/**
 * Step 59.13's "Add gate" and "Add monitor". Principals and super admins
 * only. The school is always the signed-in person's own (`session.schoolId`:
 * a super admin's is the school they opened), never anything the browser
 * sends. Validated here with the same schema the form already checked,
 * since a Server Function can be called directly.
 */
export async function addDevice(input: DeviceFormInput): Promise<AddDeviceResult> {
  const session = await getSession();
  if (!session) return { ok: false, formError: SIGNED_OUT_MESSAGE };
  if (!session.schoolId || session.role === "teacher") {
    return { ok: false, formError: "You don't have permission to add devices." };
  }

  const parsed = deviceFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldError: parsed.error.issues[0]?.message ?? "Enter a name for this device" };
  }

  const created = await createDevice({ schoolId: session.schoolId, ...parsed.data });
  if (!created.ok) {
    return created.reason === "name-in-use"
      ? { ok: false, fieldError: DEVICE_NAME_IN_USE_MESSAGE }
      : { ok: false, formError: DEVICE_LIMIT_MESSAGE };
  }

  refresh();
  const origin = await requestOrigin();
  return {
    ok: true,
    kind: created.device.kind,
    label: created.device.label,
    secret:
      created.device.kind === "monitor"
        ? `${origin}/gate/display/connect?key=${created.token}`
        : created.token,
    gatePage: `${origin}/gate`,
  };
}
