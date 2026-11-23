import { describe, expect, it, vi } from "vitest";
import { setDeviceStatus } from "./set-device-status";

describe("setDeviceStatus (Step 59.14)", () => {
  it("changes the caller's own school's device", async () => {
    const setStatus = vi.fn().mockResolvedValue(true);
    await expect(
      setDeviceStatus({ schoolId: "school-a", id: "d1", status: "revoked" }, { setStatus }),
    ).resolves.toEqual({
      ok: true,
    });
    expect(setStatus).toHaveBeenCalledWith("school-a", "d1", "revoked");
  });

  it("says not found for a device that isn't there or isn't this school's, and never confirms which", async () => {
    const setStatus = vi.fn().mockResolvedValue(false);
    await expect(
      setDeviceStatus({ schoolId: "school-a", id: "d-other", status: "active" }, { setStatus }),
    ).resolves.toEqual({ ok: false, reason: "not-found" });
  });
});
