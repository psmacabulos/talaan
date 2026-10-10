import { describe, expect, it } from "vitest";
import type { Device } from "@/features/devices/types";
import { authenticateDevice } from "./authenticate-device";
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
