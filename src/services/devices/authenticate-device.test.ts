import { describe, expect, it } from "vitest";
import type { Device } from "@/features/devices/types";
import { authenticateDevice, findDeviceByToken } from "./authenticate-device";
import { hashDeviceToken } from "./device-token";

const gate: Device = {
  id: "device-a",
  schoolId: "school-a",
  label: "Main gate tablet",
  kind: "gate",
  status: "active",
  lastSeenAt: null,
};

/** A stand-in for the database: knows exactly one token. */
function devicesWith(device: Device, token: string) {
  return {
    async findByTokenHash(tokenHash: string) {
      return tokenHash === hashDeviceToken(token) ? device : null;
    },
  };
}

describe("authenticateDevice", () => {
  it("finds the active device a token belongs to", async () => {
    const devices = devicesWith(gate, "tal_dev_good");
    await expect(authenticateDevice("Bearer tal_dev_good", devices)).resolves.toEqual(gate);
  });

  it("rejects a wrong or missing token", async () => {
    const devices = devicesWith(gate, "tal_dev_good");
    await expect(authenticateDevice("Bearer tal_dev_bad", devices)).resolves.toBeNull();
    await expect(authenticateDevice(null, devices)).resolves.toBeNull();
  });

  it("rejects a revoked device's token", async () => {
    const devices = devicesWith({ ...gate, status: "revoked" }, "tal_dev_good");
    await expect(authenticateDevice("Bearer tal_dev_good", devices)).resolves.toBeNull();
  });
});

describe("findDeviceByToken (Step 59.14)", () => {
  it("finds a disabled device too, so a gate can tell it from an unknown key", async () => {
    const disabled = { ...gate, status: "revoked" as const };
    await expect(findDeviceByToken("Bearer tal_dev_good", devicesWith(disabled, "tal_dev_good"))).resolves.toEqual(
      disabled,
    );
    await expect(findDeviceByToken("Bearer tal_dev_bad", devicesWith(disabled, "tal_dev_good"))).resolves.toBeNull();
    await expect(findDeviceByToken(null, devicesWith(disabled, "tal_dev_good"))).resolves.toBeNull();
  });
});
