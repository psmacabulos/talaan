import type { PrismaClient, Tap as TapRow } from "@/generated/prisma/client";
import { tapSchema } from "@/features/attendance/schemas";
import type { Tap } from "@/features/attendance/types";
import { prisma } from "@/lib/db";
import { nextDate, schoolTimeToIso } from "@/lib/school-time";
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
const NEWEST_FIRST = [{ tappedAt: "desc" as const }, { id: "desc" as const }];

/** From the school's midnight on `date` up to (not including) the next one. */
function schoolDay(date: string) {
  return { gte: new Date(schoolTimeToIso(date, "00:00")), lt: new Date(schoolTimeToIso(nextDate(date), "00:00")) };
}

export function createPrismaTapRepository(db: PrismaClient = prisma): TapRepository {
  return {
    async listBySchoolOnDate(schoolId, date) {
      // The (schoolId, tappedAt) index answers this without reading other days.
      const rows = await db.tap.findMany({ where: { schoolId, tappedAt: schoolDay(date) }, orderBy: EARLIEST_FIRST });
      return rows.map(toTap);
    },
    async listByStudentOnDate(schoolId, studentId, date) {
      // The (studentId, tappedAt) index reads just this student's day, however many years they've tapped.
      const rows = await db.tap.findMany({
        where: { studentId, schoolId, tappedAt: schoolDay(date) },
        orderBy: EARLIEST_FIRST,
      });
      return rows.map(toTap);
    },
    async listRecentByStudent(schoolId, studentId, limit) {
      // Read backwards along the (studentId, tappedAt) index, stopping after `limit`.
      const rows = await db.tap.findMany({ where: { studentId, schoolId }, orderBy: NEWEST_FIRST, take: limit });
      return rows.map(toTap);
    },
    async listByStudent(schoolId, studentId) {
      const rows = await db.tap.findMany({ where: { studentId, schoolId }, orderBy: EARLIEST_FIRST });
      return rows.map(toTap);
    },
    async getById(id) {
      const row = await db.tap.findUnique({ where: { id } });
      return row ? toTap(row) : null;
    },
    async getInSchool(schoolId, id) {
      const row = await db.tap.findFirst({ where: { id, schoolId } });
      return row ? toTap(row) : null;
    },
    async findByCardBetween(schoolId, cardSerial, from, to) {
      // The (schoolId, tappedAt) index narrows this to a few minutes of one
      // school's taps before the serial is compared.
      const row = await db.tap.findFirst({
        where: { schoolId, cardSerial, tappedAt: { gt: new Date(from), lt: new Date(to) } },
        orderBy: EARLIEST_FIRST,
      });
      return row ? toTap(row) : null;
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
