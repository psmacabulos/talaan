import type { PrismaClient, Tap as TapRow } from "@/generated/prisma/client";
import { tapSchema } from "@/features/attendance/schemas";
import type { Tap } from "@/features/attendance/types";
import { prisma } from "@/lib/db";
import type { TapRepository } from "./tap-repository";

/** A database row → the app's own `Tap`. */
export function toTap(row: TapRow): Tap {
  return tapSchema.parse({
    id: row.id,
    schoolId: row.schoolId,
    stationId: row.stationId,
    cardSerial: row.cardSerial,
    studentId: row.studentId,
    tappedAt: row.tappedAt.toISOString(),
  });
}

/** The app's `Tap` → the columns Prisma writes. The reverse of `toTap`. */
export function toTapData(tap: Tap) {
  return {
    schoolId: tap.schoolId,
    stationId: tap.stationId,
    cardSerial: tap.cardSerial,
    studentId: tap.studentId,
    tappedAt: new Date(tap.tappedAt),
  };
}

/** Oldest first; the id only breaks a tie between two taps in the same millisecond. */
const EARLIEST_FIRST = [{ tappedAt: "asc" as const }, { id: "asc" as const }];

export function createPrismaTapRepository(db: PrismaClient = prisma): TapRepository {
  return {
    async listBySchool(schoolId) {
      const rows = await db.tap.findMany({ where: { schoolId }, orderBy: EARLIEST_FIRST });
      return rows.map(toTap);
    },
    async listByStudent(studentId) {
      const rows = await db.tap.findMany({ where: { studentId }, orderBy: EARLIEST_FIRST });
      return rows.map(toTap);
    },
    async create(tap) {
      // The device's own id makes this idempotent: a retried tap finds its
      // row already there and changes nothing.
      const row = await db.tap.upsert({
        where: { id: tap.id },
        update: {},
        create: { id: tap.id, ...toTapData(tap) },
      });
      return toTap(row);
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const tapRepository = createPrismaTapRepository();
