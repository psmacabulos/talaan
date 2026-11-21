// @vitest-environment node
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaDeviceRepository } from "./prisma-device-repository";

/**
 * The Devices page's queries against real Postgres (Step 59.12): a school
 * sees only its own devices, gates first, without the key's hash, and a
 * device is written as seen at most once per gap. Its devices are its own
 * (ids starting "device-test-"), on two demo schools, removed afterwards.
 * Skipped, not failed, when E2E_DATABASE_URL isn't set.
 */
const url = process.env.E2E_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;

const PREFIX = "device-test-";
const BALANGA = "school-balanga";
const OCEANVIEW = "school-oceanview";
const MINUTE = 60_000;

describeWithDatabase("devices on Postgres (Step 59.12; needs E2E_DATABASE_URL)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const devices = createPrismaDeviceRepository(db);

  async function cleanUp() {
    await db.device.deleteMany({ where: { id: { startsWith: PREFIX } } });
  }

  function device(id: string, schoolId: string, kind: "gate" | "monitor", createdAt: string) {
    return {
      id: `${PREFIX}${id}`,
      schoolId,
      label: id,
      kind,
      tokenHash: `${PREFIX}${id}`,
      createdAt: new Date(createdAt),
    } as const;
  }

  beforeAll(async () => {
    await cleanUp();
    await db.device.createMany({
      data: [
        device("monitor", BALANGA, "monitor", "2026-01-01T00:00:00Z"),
        device("gate-new", BALANGA, "gate", "2026-01-03T00:00:00Z"),
        device("gate-old", BALANGA, "gate", "2026-01-02T00:00:00Z"),
        device("oceanview-gate", OCEANVIEW, "gate", "2026-01-01T00:00:00Z"),
      ],
    });
  });

  afterAll(async () => {
    await cleanUp();
    await db.$disconnect();
  });

  it("lists only the school's own devices, gates first, oldest first, without the key's hash", async () => {
    const listed = (await devices.listBySchool(BALANGA)).filter((d) => d.id.startsWith(PREFIX));

    expect(listed.map((d) => d.label)).toEqual(["gate-old", "gate-new", "monitor"]);
    expect(listed[0]).not.toHaveProperty("tokenHash");

    const oceanview = await devices.listBySchool(OCEANVIEW);
    expect(oceanview.map((d) => d.id)).toContain(`${PREFIX}oceanview-gate`);
    expect(oceanview.every((d) => d.schoolId === OCEANVIEW)).toBe(true);
  });

  it("marks a device seen at most once per gap", async () => {
    const id = `${PREFIX}gate-old`;
    const seenAt = async () => (await db.device.findUniqueOrThrow({ where: { id } })).lastSeenAt?.toISOString();
    const first = "2026-06-19T01:00:00.000Z";

    await devices.markSeen(id, first, 4 * MINUTE);
    expect(await seenAt()).toBe(first);

    // Within the gap: nothing is written.
    await devices.markSeen(id, "2026-06-19T01:03:59.000Z", 4 * MINUTE);
    expect(await seenAt()).toBe(first);

    // Past the gap: written.
    await devices.markSeen(id, "2026-06-19T01:04:01.000Z", 4 * MINUTE);
    expect(await seenAt()).toBe("2026-06-19T01:04:01.000Z");

    // An unknown device changes nothing and doesn't throw.
    await expect(devices.markSeen(`${PREFIX}missing`, first, 4 * MINUTE)).resolves.toBeUndefined();
  });
});
