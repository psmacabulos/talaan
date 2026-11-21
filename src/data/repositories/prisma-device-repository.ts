import type { Device as DeviceRow, PrismaClient } from "@/generated/prisma/client";
import { deviceSchema } from "@/features/devices/schemas";
import type { Device } from "@/features/devices/types";
import { prisma } from "@/lib/db";
import type { DeviceRepository } from "./device-repository";

/** The columns a `Device` needs: never the token hash (Step 59.12). */
const DEVICE_COLUMNS = { id: true, schoolId: true, label: true, kind: true, status: true, lastSeenAt: true } as const;

/** A database row → the app's own `Device`, without the token hash. */
export function toDevice(row: Pick<DeviceRow, keyof typeof DEVICE_COLUMNS>): Device {
  return deviceSchema.parse({
    id: row.id,
    schoolId: row.schoolId,
    label: row.label,
    kind: row.kind,
    status: row.status,
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
  });
}

export function createPrismaDeviceRepository(db: PrismaClient = prisma): DeviceRepository {
  return {
    async findByTokenHash(tokenHash) {
      const row = await db.device.findUnique({ where: { tokenHash } });
      return row ? toDevice(row) : null;
    },
    async create(device, tokenHash) {
      const row = await db.device.create({
        data: {
          id: device.id,
          schoolId: device.schoolId,
          label: device.label,
          kind: device.kind,
          status: device.status,
          tokenHash,
        },
      });
      return toDevice(row);
    },
    async recordHeartbeat(id, at) {
      await db.device.updateMany({ where: { id }, data: { lastSeenAt: new Date(at) } });
    },
    async listBySchool(schoolId) {
      const rows = await db.device.findMany({
        where: { schoolId },
        select: DEVICE_COLUMNS,
        orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
      });
      return rows.map(toDevice);
    },
    async markSeen(id, at, minGapMs) {
      const seenAt = new Date(at);
      // One conditional UPDATE: it writes nothing when the device was seen
      // within the gap. Worked out from `at` (the app's clock), not the
      // database's now(), so a pinned demo clock stays consistent.
      await db.device.updateMany({
        where: {
          id,
          OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(seenAt.getTime() - minGapMs) } }],
        },
        data: { lastSeenAt: seenAt },
      });
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const deviceRepository = createPrismaDeviceRepository();
