import { describe, expect, it, vi } from "vitest";
import { markDeviceSeen, SEEN_GAP_MS } from "./mark-seen";

describe("markDeviceSeen (Step 59.12)", () => {
  it("marks the device with the 4-minute gap", async () => {
    const markSeen = vi.fn().mockResolvedValue(undefined);
    await markDeviceSeen("device-a", "2026-06-19T01:15:00.000Z", { markSeen });
    expect(markSeen).toHaveBeenCalledWith("device-a", "2026-06-19T01:15:00.000Z", SEEN_GAP_MS);
    expect(SEEN_GAP_MS).toBe(4 * 60_000);
  });

  it("never throws when the write fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const markSeen = vi.fn().mockRejectedValue(new Error("connection lost"));

    await expect(markDeviceSeen("device-a", "2026-06-19T01:15:00.000Z", { markSeen })).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
