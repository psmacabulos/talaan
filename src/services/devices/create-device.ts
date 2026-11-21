import { deviceRepository } from "@/data/repositories";
import type { DeviceRepository } from "@/data/repositories/device-repository";
import type { Device, DeviceKind } from "@/features/devices/types";
import { cleanDeviceName, deviceNameKey, MAX_DEVICES_PER_SCHOOL } from "@/features/devices/names";
import { generateDeviceToken, hashDeviceToken } from "./device-token";

export type CreateDeviceResult =
  | { ok: true; device: Device; token: string }
  | { ok: false; reason: "name-in-use" | "limit-reached" };

/**
 * Makes a gate or monitor for a school (Step 59.13): refuses a name the
 * school already uses (case and spaces ignored) and a school that already
 * has the most devices it may; otherwise stores the new device with the
 * token's hash and returns the token, which is shown once and never kept.
 *
 * Both checks read the school's own device list, at most
 * `MAX_DEVICES_PER_SCHOOL` rows, so they need no new query. They run before
 * the insert, not inside one transaction: adding a device is rare and only
 * a principal does it, so two simultaneous adds could slip one extra past a
 * check, which costs nothing and is easy to see and remove.
 */
export async function createDevice(
  input: { schoolId: string; kind: DeviceKind; label: string },
  devices: DeviceRepository = deviceRepository,
): Promise<CreateDeviceResult> {
  const label = cleanDeviceName(input.label);
  const existing = await devices.listBySchool(input.schoolId);

  if (existing.length >= MAX_DEVICES_PER_SCHOOL) return { ok: false, reason: "limit-reached" };
  if (existing.some((device) => deviceNameKey(device.label) === deviceNameKey(label))) {
    return { ok: false, reason: "name-in-use" };
  }

  const token = generateDeviceToken();
  const device = await devices.create(
    { id: crypto.randomUUID(), schoolId: input.schoolId, label, kind: input.kind, status: "active", lastSeenAt: null },
    hashDeviceToken(token),
  );
  return { ok: true, device, token };
}
