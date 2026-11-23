// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEVICE_DISABLED_CODE } from "@/features/devices/disabled";
import { hashDeviceToken } from "@/services/devices/device-token";

const state = vi.hoisted(() => ({ device: null as unknown, recordHeartbeat: vi.fn() }));
vi.mock("@/data/repositories", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/data/repositories")>();
  return {
    ...real,
    deviceRepository: {
      ...real.deviceRepository,
      findByTokenHash: async (hash: string) => (hash === hashDeviceToken("tal_dev_good") ? state.device : null),
      recordHeartbeat: state.recordHeartbeat,
    },
  };
});

const { POST } = await import("./route");

const device = (status: "active" | "revoked") => ({
  id: "d1",
  schoolId: "school-a",
  label: "Main gate",
  kind: "gate",
  status,
  lastSeenAt: null,
});
const call = (token: string | null) =>
  POST(
    new Request("http://localhost/api/v1/devices/heartbeat", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  );

describe("POST /api/v1/devices/heartbeat (Step 59.14)", () => {
  beforeEach(() => state.recordHeartbeat.mockReset());

  it("answers an enabled device and marks it seen", async () => {
    state.device = device("active");
    const response = await call("tal_dev_good");
    expect(response.status).toBe(200);
    expect(state.recordHeartbeat).toHaveBeenCalledTimes(1);
  });

  it("tells a disabled device's real key apart from an unknown one: 403 with the code, and nothing written", async () => {
    state.device = device("revoked");
    const disabled = await call("tal_dev_good");
    expect(disabled.status).toBe(403);
    expect(await disabled.json()).toMatchObject({ code: DEVICE_DISABLED_CODE });

    const unknown = await call("tal_dev_bad");
    expect(unknown.status).toBe(401);
    expect(await unknown.json()).not.toHaveProperty("code");
    expect((await call(null)).status).toBe(401);
    expect(state.recordHeartbeat).not.toHaveBeenCalled();
  });
});
