import { deviceRepository } from "@/data/repositories";
import { getNow } from "@/lib/clock";
import { DEVICE_DISABLED_CODE, DEVICE_DISABLED_MESSAGE } from "@/features/devices/disabled";
import { findDeviceByToken } from "@/services/devices/authenticate-device";

/**
 * A device checks in: "this token works, and I'm online." The gate's setup
 * screen calls it once when a token is entered, and shows the device's own
 * details it answers with ("Connected as Main gate tablet"). There's no
 * timer: during the day every recorded tap marks the gate as seen too.
 * Also answers with the server's clock, so a device can notice its own
 * clock is wrong.
 */
export async function POST(request: Request) {
  const device = await findDeviceByToken(request.headers.get("authorization"));
  if (!device) return Response.json({ error: "Missing or unknown device token." }, { status: 401 });
  // A disabled device's real key is told so (Step 59.14), so its tablet waits instead of forgetting the key.
  if (device.status !== "active") {
    return Response.json({ error: DEVICE_DISABLED_MESSAGE, code: DEVICE_DISABLED_CODE }, { status: 403 });
  }

  const now = new Date().toISOString();
  // Seen on the app's clock, like every other "seen" (Step 59.12), so a
  // pinned DEMO_NOW doesn't leave a gate "Online" forever. The same as
  // `now` on a real server.
  await deviceRepository.recordHeartbeat(device.id, getNow());

  return Response.json({
    device: { id: device.id, schoolId: device.schoolId, label: device.label, kind: device.kind },
    serverTime: now,
  });
}
