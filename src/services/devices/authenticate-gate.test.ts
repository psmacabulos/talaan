import { describe, expect, it } from "vitest";
import type { Device } from "@/features/devices/types";
import { authenticateGate } from "./authenticate-gate";
import { hashDeviceToken } from "./device-token";

const gate: Device = {
  id: "device-a",
  schoolId: "school-a",
  label: "Main gate tablet",
  kind: "gate",
  status: "active",
  lastSeenAt: null,
};

function devicesWith(device: Device, token: string) {
  return {
    async findByTokenHash(tokenHash: string) {
      return tokenHash === hashDeviceToken(token) ? device : null;
    },
  };
}

describe("authenticateGate", () => {
  it("accepts an active gate's token", async () => {
    await expect(authenticateGate("Bearer tal_dev_good", devicesWith(gate, "tal_dev_good"))).resolves.toEqual({
      ok: true,
      device: gate,
    });
  });

  it("answers 403 for a monitor's token", async () => {
    const monitor = { ...gate, kind: "monitor" as const };
    await expect(authenticateGate("Bearer tal_dev_good", devicesWith(monitor, "tal_dev_good"))).resolves.toMatchObject({
      ok: false,
      status: 403,
    });
  });

  it("answers 401 for no token, a wrong token, or a revoked gate", async () => {
    const devices = devicesWith(gate, "tal_dev_good");
    await expect(authenticateGate(null, devices)).resolves.toMatchObject({ ok: false, status: 401 });
    await expect(authenticateGate("Bearer tal_dev_bad", devices)).resolves.toMatchObject({ ok: false, status: 401 });
    const revoked = devicesWith({ ...gate, status: "revoked" }, "tal_dev_good");
    await expect(authenticateGate("Bearer tal_dev_good", revoked)).resolves.toMatchObject({ ok: false, status: 401 });
  });
});
