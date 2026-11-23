import { deviceRepository, type DeviceRepository } from "@/data/repositories";

/**
 * Whether an open monitor's device is still enabled (Step 59.14): one read
 * by primary key. A database hiccup counts as "still enabled", so a brief
 * error never cuts a guardhouse screen off; the next check asks again.
 */
export async function isDeviceStillActive(
  id: string,
  devices: Pick<DeviceRepository, "findStatus"> = deviceRepository,
): Promise<boolean> {
  try {
    return (await devices.findStatus(id)) === "active";
  } catch (error) {
    console.warn("Couldn't check a device's status:", error instanceof Error ? error.message : "unknown error");
    return true;
  }
}
