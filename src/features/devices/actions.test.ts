import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const createDevice = vi.fn();
const refresh = vi.fn();
const setDeviceStatus = vi.fn();

vi.mock("@/lib/session", () => ({ getSession: () => getSession() }));
vi.mock("@/lib/request-origin", () => ({ requestOrigin: async () => "https://bantayaral.test" }));
vi.mock("@/services/devices/create-device", () => ({ createDevice: (input: unknown) => createDevice(input) }));
vi.mock("@/services/devices/set-device-status", () => ({
  setDeviceStatus: (input: unknown) => setDeviceStatus(input),
}));
vi.mock("next/cache", () => ({ refresh: () => refresh() }));

import { addDevice, disableDevice, enableDevice } from "./actions";
import { DEVICE_LIMIT_MESSAGE, DEVICE_NAME_IN_USE_MESSAGE } from "./names";

const principal = { userId: "u1", role: "principal", schoolId: "school-a" };
const made = (kind: "gate" | "monitor") => ({
  ok: true,
  token: "tal_dev_SECRET",
  device: { id: "d1", schoolId: "school-a", label: "Main gate", kind, status: "active", lastSeenAt: null },
});

describe("addDevice (Step 59.13)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue(principal);
  });

  it("refuses a signed-out caller, a teacher, and a session with no school", async () => {
    getSession.mockResolvedValueOnce(null);
    expect((await addDevice({ kind: "gate", label: "Main" })).ok).toBe(false);
    getSession.mockResolvedValueOnce({ ...principal, role: "teacher" });
    expect((await addDevice({ kind: "gate", label: "Main" })).ok).toBe(false);
    getSession.mockResolvedValueOnce({ ...principal, role: "super_admin", schoolId: null });
    expect((await addDevice({ kind: "gate", label: "Main" })).ok).toBe(false);
    expect(createDevice).not.toHaveBeenCalled();
  });

  it("validates the name again on the server", async () => {
    const empty = await addDevice({ kind: "gate", label: "   " });
    const long = await addDevice({ kind: "gate", label: "x".repeat(61) });

    expect(empty).toEqual({ ok: false, fieldError: "Enter a name for this device" });
    expect(long.ok).toBe(false);
    expect(createDevice).not.toHaveBeenCalled();
  });

  it("always uses the signed-in person's own school", async () => {
    createDevice.mockResolvedValue(made("gate"));

    await addDevice({ kind: "gate", label: "Main gate", schoolId: "school-other" } as never);

    expect(createDevice).toHaveBeenCalledWith({ schoolId: "school-a", kind: "gate", label: "Main gate" });
  });

  it("returns a gate's key as it is, with the address of the gate page", async () => {
    createDevice.mockResolvedValue(made("gate"));

    expect(await addDevice({ kind: "gate", label: "Main gate" })).toEqual({
      ok: true,
      kind: "gate",
      label: "Main gate",
      secret: "tal_dev_SECRET",
      gatePage: "https://bantayaral.test/gate",
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("returns a monitor's finished link", async () => {
    createDevice.mockResolvedValue(made("monitor"));

    const result = await addDevice({ kind: "monitor", label: "Main gate" });

    expect(result).toMatchObject({
      ok: true,
      secret: "https://bantayaral.test/gate/display/connect?key=tal_dev_SECRET",
    });
  });

  it("says why a name or a full school is refused, without a secret", async () => {
    createDevice.mockResolvedValueOnce({ ok: false, reason: "name-in-use" });
    expect(await addDevice({ kind: "gate", label: "Main gate" })).toEqual({
      ok: false,
      fieldError: DEVICE_NAME_IN_USE_MESSAGE,
    });

    createDevice.mockResolvedValueOnce({ ok: false, reason: "limit-reached" });
    expect(await addDevice({ kind: "gate", label: "Main gate" })).toEqual({
      ok: false,
      formError: DEVICE_LIMIT_MESSAGE,
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("disableDevice and enableDevice (Step 59.14)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue(principal);
    setDeviceStatus.mockResolvedValue({ ok: true });
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  it("refuses a signed-out caller, a teacher, and a session with no school", async () => {
    getSession.mockResolvedValueOnce(null);
    expect((await disableDevice("d1")).ok).toBe(false);
    getSession.mockResolvedValueOnce({ ...principal, role: "teacher" });
    expect((await disableDevice("d1")).ok).toBe(false);
    getSession.mockResolvedValueOnce({ ...principal, role: "super_admin", schoolId: null });
    expect((await enableDevice("d1")).ok).toBe(false);
    expect(setDeviceStatus).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("disables with the revoked status and enables with the active one, always for the session's own school", async () => {
    expect(await disableDevice("d1")).toEqual({ ok: true });
    expect(setDeviceStatus).toHaveBeenLastCalledWith({ schoolId: "school-a", id: "d1", status: "revoked" });

    expect(await enableDevice("d1")).toEqual({ ok: true });
    expect(setDeviceStatus).toHaveBeenLastCalledWith({ schoolId: "school-a", id: "d1", status: "active" });
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("says not found for another school's device, without refreshing", async () => {
    setDeviceStatus.mockResolvedValue({ ok: false, reason: "not-found" });
    const result = await disableDevice("d-other");
    expect(result).toEqual({ ok: false, error: "That device wasn't found. Reload the page." });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("logs the device id and role only, never a name", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await disableDevice("d1");
    expect(info).toHaveBeenCalledWith("device d1 disabled by principal");
  });
});
