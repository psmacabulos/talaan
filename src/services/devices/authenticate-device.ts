import { deviceRepository, type DeviceRepository } from "@/data/repositories";
import type { Device } from "@/features/devices/types";
import { hashDeviceToken, readBearerToken } from "./device-token";

/**
 * Who is calling, from the request's `Authorization` header: the active
 * device the token belongs to, or null for a missing, unknown or revoked
 * token. Every `/api/v1` route a device calls starts with this.
 */
export async function authenticateDevice(
  authorization: string | null,
  devices: Pick<DeviceRepository, "findByTokenHash"> = deviceRepository,
): Promise<Device | null> {
  const token = readBearerToken(authorization);
  if (!token) return null;

  const device = await devices.findByTokenHash(hashDeviceToken(token));
  return device?.status === "active" ? device : null;
}
