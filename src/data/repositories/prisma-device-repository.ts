import type { Device as DeviceRow, PrismaClient } from "@/generated/prisma/client";
import { deviceSchema } from "@/features/devices/schemas";
import type { Device } from "@/features/devices/types";
import { prisma } from "@/lib/db";
import type { DeviceRepository } from "./device-repository";

/** A database row → the app's own `Device`, without the token hash. */
export function toDevice(row: DeviceRow): Device {
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
  };
}

/** The one instance the rest of the app actually imports. */
export const deviceRepository = createPrismaDeviceRepository();
