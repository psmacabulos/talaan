import { deviceRepository, type DeviceRepository } from "@/data/repositories";
import type { Device } from "@/features/devices/types";
import { hashDeviceToken, readBearerToken } from "./device-token";

/**
 * The device a token belongs to, whatever its status, or null for a
 * missing or unknown token. A gate needs the difference between "no such
 * key" and "a disabled device's key" (Step 59.14); everything else uses
 * `authenticateDevice`.
 */
export async function findDeviceByToken(
  authorization: string | null,
  devices: Pick<DeviceRepository, "findByTokenHash"> = deviceRepository,
): Promise<Device | null> {
  const token = readBearerToken(authorization);
  if (!token) return null;
  return devices.findByTokenHash(hashDeviceToken(token));
}

/**
 * Who is calling, from the request's `Authorization` header: the active
 * device the token belongs to, or null for a missing, unknown or disabled
 * token. Every `/api/v1` route a device calls starts with this.
 */
export async function authenticateDevice(
  authorization: string | null,
  devices: Pick<DeviceRepository, "findByTokenHash"> = deviceRepository,
): Promise<Device | null> {
  const device = await findDeviceByToken(authorization, devices);
  return device?.status === "active" ? device : null;
}
