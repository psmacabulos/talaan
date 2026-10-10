import { describe, expect, it } from "vitest";
import type { Device as DeviceRow } from "@/generated/prisma/client";
import { toDevice } from "./prisma-device-repository";

const row: DeviceRow = {
  id: "device-a",
  schoolId: "school-a",
  label: "Main gate tablet",
  kind: "gate",
  tokenHash: "a".repeat(64),
  status: "active",
  lastSeenAt: null,
  createdAt: new Date("2026-10-09T00:00:00Z"),
  updatedAt: new Date("2026-10-09T00:00:00Z"),
};

describe("toDevice", () => {
  it("leaves the token hash behind", () => {
    expect(toDevice(row)).not.toHaveProperty("tokenHash");
  });

  it("keeps 'never seen' as null and a heartbeat as an ISO time", () => {
    expect(toDevice(row).lastSeenAt).toBeNull();
    const seen = toDevice({ ...row, lastSeenAt: new Date("2026-10-09T07:30:00Z") });
    expect(seen.lastSeenAt).toBe("2026-10-09T07:30:00.000Z");
  });
});
