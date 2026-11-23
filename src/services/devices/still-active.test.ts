import { afterEach, describe, expect, it, vi } from "vitest";
import { isDeviceStillActive } from "./still-active";

describe("isDeviceStillActive (Step 59.14)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is true for an enabled device, false for a disabled or missing one", async () => {
    await expect(isDeviceStillActive("d1", { findStatus: async () => "active" })).resolves.toBe(true);
    await expect(isDeviceStillActive("d1", { findStatus: async () => "revoked" })).resolves.toBe(false);
    await expect(isDeviceStillActive("d1", { findStatus: async () => null })).resolves.toBe(false);
  });

  it("counts a database error as still enabled, so a hiccup never cuts a screen off", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const failing = {
      findStatus: async () => {
        throw new Error("connection lost");
      },
    };
    await expect(isDeviceStillActive("d1", failing)).resolves.toBe(true);
    expect(warn).toHaveBeenCalled();
  });
});
