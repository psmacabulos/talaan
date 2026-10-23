import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GateOfflineError,
  GateServerError,
  GateUnauthorizedError,
  readStoredDevice,
  saveToken,
  sendTap,
} from "./gate-client";

const TAP = { clientTapId: "3fa85f64-5717-4562-b3fc-2c963f66afa6", cardSerial: "0211299923", clientTappedAt: "x" };

function answering(status: number, body: unknown = { outcome: "invalid_serial" }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

describe("sendTap (Step 58)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the server's answer", async () => {
    answering(200, { outcome: "invalid_serial" });
    await expect(sendTap("tal_dev_x", TAP)).resolves.toEqual({ outcome: "invalid_serial" });
  });

  it("counts no connection, and a server that isn't there just now, as offline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))),
    );
    await expect(sendTap("tal_dev_x", TAP)).rejects.toBeInstanceOf(GateOfflineError);
    for (const status of [429, 502, 503, 504]) {
      answering(status);
      await expect(sendTap("tal_dev_x", TAP)).rejects.toBeInstanceOf(GateOfflineError);
    }
  });

  it("makes every other error answer a server error, never a reason to drop the tap", async () => {
    for (const status of [400, 404, 405, 407, 500]) {
      answering(status);
      await expect(sendTap("tal_dev_x", TAP)).rejects.toBeInstanceOf(GateServerError);
    }
  });

  it("says a refused token is refused", async () => {
    for (const status of [401, 403]) {
      answering(status);
      await expect(sendTap("tal_dev_x", TAP)).rejects.toBeInstanceOf(GateUnauthorizedError);
    }
  });

  it("treats an answer cut off on its way as offline, so the tap is sent again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{not json", { status: 200 })),
    );
    await expect(sendTap("tal_dev_x", TAP)).rejects.toBeInstanceOf(GateOfflineError);
  });
});

describe("saveToken (Step 58)", () => {
  beforeEach(() => window.localStorage.clear());

  it("forgets the saved gate when a different token comes, but not for the same one", () => {
    saveToken("tal_dev_one");
    window.localStorage.setItem("talaan.gate.device", JSON.stringify({ label: "Main gate", schoolId: "school-a" }));
    saveToken("tal_dev_one");
    expect(readStoredDevice()).toEqual({ label: "Main gate", schoolId: "school-a" });
    saveToken("tal_dev_two");
    expect(readStoredDevice()).toBeNull();
  });
});
