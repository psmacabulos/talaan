// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { DEVICE_DISABLED_CODE } from "@/features/devices/disabled";
import { hashDeviceToken } from "@/services/devices/device-token";

const state = vi.hoisted(() => ({ status: "revoked" as "active" | "revoked" }));
vi.mock("@/data/repositories", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/data/repositories")>();
  return {
    ...real,
    deviceRepository: {
      ...real.deviceRepository,
      findByTokenHash: async (hash: string) =>
        hash === hashDeviceToken("tal_dev_good")
          ? { id: "d1", schoolId: "school-a", label: "Main gate", kind: "gate", status: state.status, lastSeenAt: null }
          : null,
    },
  };
});

const { GET } = await import("./route");

const call = (token: string) =>
  GET(
    new Request("http://localhost/api/v1/gate/roster", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
  );

describe("GET /api/v1/gate/roster for a disabled gate (Step 59.14)", () => {
  it("answers 403 with the disabled code for its real key, and 401 without a code for an unknown one", async () => {
    const disabled = await call("tal_dev_good");
    expect(disabled.status).toBe(403);
    expect(await disabled.json()).toMatchObject({ code: DEVICE_DISABLED_CODE });

    const unknown = await call("tal_dev_bad");
    expect(unknown.status).toBe(401);
    expect(await unknown.json()).not.toHaveProperty("code");
  });
});
