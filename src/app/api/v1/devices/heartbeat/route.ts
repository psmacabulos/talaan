import { deviceRepository } from "@/data/repositories";
import { authenticateDevice } from "@/services/devices/authenticate-device";

/**
 * A device checks in: "this token works, and I'm online." The gate's setup
 * screen calls it once when a token is entered, and shows the device's own
 * details it answers with ("Connected as Main gate tablet"). There's no
 * timer: during the day every recorded tap marks the gate as seen too.
 * Also answers with the server's clock, so a device can notice its own
 * clock is wrong.
 */
export async function POST(request: Request) {
  const device = await authenticateDevice(request.headers.get("authorization"));
  if (!device) {
    return Response.json({ error: "Missing, unknown or revoked device token." }, { status: 401 });
  }

  const now = new Date().toISOString();
  await deviceRepository.recordHeartbeat(device.id, now);

  return Response.json({
    device: { id: device.id, schoolId: device.schoolId, label: device.label, kind: device.kind },
    serverTime: now,
  });
}
