import { deviceRepository, type DeviceRepository } from "@/data/repositories";
import type { Device } from "@/features/devices/types";
import { authenticateDevice } from "./authenticate-device";

export type GateAuthResult = { ok: true; device: Device } | { ok: false; status: 401 | 403; error: string };

/**
 * The calling gate, or why not: 401 for a missing, unknown or revoked
 * token, 403 for a monitor's token (a monitor only watches; it never
 * records taps or downloads the roster).
 */
export async function authenticateGate(
  authorization: string | null,
  devices: Pick<DeviceRepository, "findByTokenHash"> = deviceRepository,
): Promise<GateAuthResult> {
  const device = await authenticateDevice(authorization, devices);
  if (!device) return { ok: false, status: 401, error: "Missing, unknown or revoked device token." };
  if (device.kind !== "gate") return { ok: false, status: 403, error: "Only a gate device can do this." };
  return { ok: true, device };
}
