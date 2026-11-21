import { describe, expect, it, vi } from "vitest";
import type { DeviceRepository } from "@/data/repositories/device-repository";
import { MAX_DEVICES_PER_SCHOOL } from "@/features/devices/names";
import type { Device } from "@/features/devices/types";
import { createDevice } from "./create-device";
import { hashDeviceToken } from "./device-token";

function device(label: string, id = label): Device {
  return { id, schoolId: "school-a", label, kind: "gate", status: "active", lastSeenAt: null };
}

function fakeRepository(existing: Device[]) {
  const create = vi.fn(async (made: Device) => made);
  const repository = { listBySchool: vi.fn(async () => existing), create } as unknown as DeviceRepository;
  return { repository, create };
}

describe("createDevice (Step 59.13)", () => {
  it("stores the token's hash, never the token, and returns the token once", async () => {
    const { repository, create } = fakeRepository([]);

    const result = await createDevice({ schoolId: "school-a", kind: "monitor", label: "  Guardhouse  TV " }, repository);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.token).toMatch(/^tal_dev_/);
    expect(result.device).toMatchObject({ schoolId: "school-a", kind: "monitor", label: "Guardhouse TV", status: "active" });
    const [stored, storedHash] = create.mock.calls[0] as unknown as [Device, string];
    expect(storedHash).toBe(hashDeviceToken(result.token));
    expect(JSON.stringify(stored)).not.toContain(result.token);
  });

  it("makes a different token every time", async () => {
    const { repository } = fakeRepository([]);
    const first = await createDevice({ schoolId: "school-a", kind: "gate", label: "A" }, repository);
    const second = await createDevice({ schoolId: "school-a", kind: "gate", label: "B" }, repository);
    expect(first.ok && second.ok && first.token !== second.token).toBe(true);
  });

  it("refuses a name the school already uses, ignoring case and spaces, even on an older row with a trailing space", async () => {
    const { repository, create } = fakeRepository([device("Main gate tablet ")]);

    const result = await createDevice({ schoolId: "school-a", kind: "gate", label: "  main GATE tablet" }, repository);

    expect(result).toEqual({ ok: false, reason: "name-in-use" });
    expect(create).not.toHaveBeenCalled();
  });

  it("counts a disabled device's name as taken", async () => {
    const { repository } = fakeRepository([{ ...device("Old gate"), status: "revoked" }]);
    expect(await createDevice({ schoolId: "school-a", kind: "gate", label: "old gate" }, repository)).toEqual({
      ok: false,
      reason: "name-in-use",
    });
  });

  it("refuses a school that already has the most devices it may", async () => {
    const full = Array.from({ length: MAX_DEVICES_PER_SCHOOL }, (_, index) => device(`Gate ${index}`));
    const { repository, create } = fakeRepository(full);

    const result = await createDevice({ schoolId: "school-a", kind: "gate", label: "One more" }, repository);

    expect(result).toEqual({ ok: false, reason: "limit-reached" });
    expect(create).not.toHaveBeenCalled();
  });
});
