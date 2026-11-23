import { describe, expect, it } from "vitest";
import type { Device } from "@/features/devices/types";
import { DEVICE_DISABLED_CODE } from "@/features/devices/disabled";
import { authenticateGate, gateAuthResponse } from "./authenticate-gate";
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

  it("answers 401 for no token or a wrong token", async () => {
    const devices = devicesWith(gate, "tal_dev_good");
    await expect(authenticateGate(null, devices)).resolves.toMatchObject({ ok: false, status: 401 });
    await expect(authenticateGate("Bearer tal_dev_bad", devices)).resolves.toMatchObject({ ok: false, status: 401 });
  });

  it("answers a disabled gate's real token with 403 and the disabled code, never 401 (Step 59.14)", async () => {
    const disabled = devicesWith({ ...gate, status: "revoked" }, "tal_dev_good");
    await expect(authenticateGate("Bearer tal_dev_good", disabled)).resolves.toMatchObject({
      ok: false,
      status: 403,
      code: DEVICE_DISABLED_CODE,
    });
  });

  it("answers a disabled monitor's token the same way, so a disabled device always gets one answer", async () => {
    const disabled = devicesWith({ ...gate, kind: "monitor", status: "revoked" }, "tal_dev_good");
    await expect(authenticateGate("Bearer tal_dev_good", disabled)).resolves.toMatchObject({
      ok: false,
      status: 403,
      code: DEVICE_DISABLED_CODE,
    });
  });
});

describe("gateAuthResponse (Step 59.14)", () => {
  it("carries the code for a disabled device and leaves it off for any other refusal", async () => {
    const disabled = gateAuthResponse({ ok: false, status: 403, error: "off", code: DEVICE_DISABLED_CODE });
    expect(disabled.status).toBe(403);
    expect(await disabled.json()).toEqual({ error: "off", code: DEVICE_DISABLED_CODE });

    const unknown = gateAuthResponse({ ok: false, status: 401, error: "no" });
    expect(unknown.status).toBe(401);
    expect(await unknown.json()).toEqual({ error: "no" });
  });
});
