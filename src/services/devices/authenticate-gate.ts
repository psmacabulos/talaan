import { deviceRepository, type DeviceRepository } from "@/data/repositories";
import { DEVICE_DISABLED_CODE, DEVICE_DISABLED_MESSAGE } from "@/features/devices/disabled";
import type { Device } from "@/features/devices/types";
import { findDeviceByToken } from "./authenticate-device";

export type GateAuthFailure = { ok: false; status: 401 | 403; error: string; code?: typeof DEVICE_DISABLED_CODE };
export type GateAuthResult = { ok: true; device: Device } | GateAuthFailure;

/**
 * The calling gate, or why not: 401 for a missing or unknown token, 403
 * with the "device disabled" code for a disabled device's real token
 * (Step 59.14: the tablet waits and keeps its key), and a plain 403 for a
 * monitor's token (a monitor only watches; it never records taps or
 * downloads the roster).
 */
export async function authenticateGate(
  authorization: string | null,
  devices: Pick<DeviceRepository, "findByTokenHash"> = deviceRepository,
): Promise<GateAuthResult> {
  const device = await findDeviceByToken(authorization, devices);
  if (!device) return { ok: false, status: 401, error: "Missing or unknown device token." };
  if (device.status !== "active") {
    return { ok: false, status: 403, error: DEVICE_DISABLED_MESSAGE, code: DEVICE_DISABLED_CODE };
  }
  if (device.kind !== "gate") return { ok: false, status: 403, error: "Only a gate device can do this." };
  return { ok: true, device };
}

/** The refusal a gate route sends back, with the code when there is one. */
export function gateAuthResponse(auth: GateAuthFailure): Response {
  return Response.json(auth.code ? { error: auth.error, code: auth.code } : { error: auth.error }, {
    status: auth.status,
  });
}
