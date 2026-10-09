import type { PrismaClient, Staff as StaffRow } from "@/generated/prisma/client";
import { staffSchema } from "@/features/staff/schemas";
import type { Staff } from "@/features/staff/types";
import { prisma } from "@/lib/db";
import type { StaffRepository } from "./staff-repository";

/**
 * A database row → the app's own `Staff` type, checked by the same Zod
 * schema as everywhere else. That check matters more here than for
 * schools: the database can't tell a teacher's advisory grade (any whole
 * number to Postgres) from a real grade 7 to 12, or catch a principal
 * with no school. `staffSchema` can.
 */
export function toStaff(row: StaffRow): Staff {
  return staffSchema.parse({
    id: row.id,
    schoolId: row.schoolId,
    role: row.role,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    status: row.status,
    advisoryGradeLevel: row.advisoryGradeLevel ?? undefined,
    advisorySection: row.advisorySection ?? undefined,
  });
}

/** The app's `Staff` → the columns Prisma writes. The reverse of `toStaff`. */
export function toStaffData(staff: Staff) {
  return {
    schoolId: staff.schoolId,
    role: staff.role,
    firstName: staff.firstName,
    lastName: staff.lastName,
    email: staff.email,
    status: staff.status,
    advisoryGradeLevel: staff.advisoryGradeLevel ?? null,
    advisorySection: staff.advisorySection ?? null,
  };
}

/** Oldest first, the same order the mock kept: the order people were added. */
const OLDEST_FIRST = [{ createdAt: "asc" as const }, { id: "asc" as const }];

export function createPrismaStaffRepository(db: PrismaClient = prisma): StaffRepository {
  return {
    async listBySchool(schoolId) {
      const rows = await db.staff.findMany({ where: { schoolId }, orderBy: OLDEST_FIRST });
      return rows.map(toStaff);
    },
    async getById(id) {
      const row = await db.staff.findUnique({ where: { id } });
      return row ? toStaff(row) : null;
    },
    async list() {
      const rows = await db.staff.findMany({ orderBy: OLDEST_FIRST });
      return rows.map(toStaff);
    },
    async create(staff) {
      const row = await db.staff.upsert({
        where: { id: staff.id },
        update: {},
        create: { id: staff.id, ...toStaffData(staff) },
      });
      return toStaff(row);
    },
    async remove(id) {
      // deleteMany, not delete: removing someone who's already gone is a
      // no-op (0 rows), the same as the mock, instead of a P2025 error.
      await db.staff.deleteMany({ where: { id } });
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const staffRepository = createPrismaStaffRepository();
