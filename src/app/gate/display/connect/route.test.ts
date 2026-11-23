// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateDevice = vi.fn();
vi.mock("@/services/devices/authenticate-device", () => ({
  authenticateDevice: (authorization: string) => authenticateDevice(authorization),
}));

const requestOrigin = vi.fn();
vi.mock("@/lib/request-origin", () => ({ requestOrigin: () => requestOrigin() }));

import { GET } from "./route";

describe("GET /gate/display/connect (Step 48, headers from Step 59.13)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestOrigin.mockResolvedValue("https://bantayaral.test");
  });

  it("redirects to the site's public address, not the address the dyno saw (P-069)", async () => {
    authenticateDevice.mockResolvedValue({ id: "d1", kind: "monitor" });
    requestOrigin.mockResolvedValue("https://bantayaral.com");

    const ok = await GET(new Request("https://localhost:22089/gate/display/connect?key=tal_dev_KEY"));
    expect(ok.headers.get("location")).toBe("https://bantayaral.com/gate/display");

    authenticateDevice.mockResolvedValue(null);
    const bad = await GET(new Request("https://localhost:22089/gate/display/connect?key=nope"));
    expect(bad.headers.get("location")).toBe("https://bantayaral.com/gate/display?error=key");
  });

  it("swaps a monitor's key for a cookie, and the answer is never cached or named as a referrer", async () => {
    authenticateDevice.mockResolvedValue({ id: "d1", kind: "monitor" });

    const response = await GET(new Request("https://bantayaral.test/gate/display/connect?key=tal_dev_KEY"));

    expect(response.headers.get("location")).toBe("https://bantayaral.test/gate/display");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("set-cookie")).toContain("talaan_monitor=tal_dev_KEY");
  });

  it("sends a gate's key, or a wrong one, to the error page without a cookie", async () => {
    authenticateDevice.mockResolvedValueOnce({ id: "d2", kind: "gate" });
    const gate = await GET(new Request("https://bantayaral.test/gate/display/connect?key=tal_dev_GATE"));
    expect(gate.headers.get("location")).toBe("https://bantayaral.test/gate/display?error=key");
    expect(gate.headers.get("set-cookie")).toBeNull();

    authenticateDevice.mockResolvedValueOnce(null);
    const wrong = await GET(new Request("https://bantayaral.test/gate/display/connect?key=nope"));
    expect(wrong.headers.get("location")).toContain("error=key");
  });
});
