import { deviceRepository, type DeviceRepository } from "@/data/repositories";
import type { Device } from "@/features/devices/types";

export type SetDeviceStatusResult = { ok: true } | { ok: false; reason: "not-found" };

/**
 * Disables or enables a school's device (Step 59.14). The school is the
 * caller's own, so another school's device is "not found" rather than
 * changed or confirmed to exist. Safe to repeat: setting a status it
 * already has is a success. A device's key never changes, so enabling
 * brings the same gate or monitor back.
 */
export async function setDeviceStatus(
  input: { schoolId: string; id: string; status: Device["status"] },
  devices: Pick<DeviceRepository, "setStatus"> = deviceRepository,
): Promise<SetDeviceStatusResult> {
  const found = await devices.setStatus(input.schoolId, input.id, input.status);
  return found ? { ok: true } : { ok: false, reason: "not-found" };
}
