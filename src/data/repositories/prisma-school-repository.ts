import { Prisma, type PrismaClient, type School as SchoolRow } from "@/generated/prisma/client";
import { schoolSchema } from "@/features/schools/schemas";
import type { School } from "@/features/schools/types";
import { prisma } from "@/lib/db";
import type { SchoolRepository } from "./school-repository";

/**
 * A database row → the app's own `School` type. The row has extra columns
 * the app doesn't use (createdAt, updatedAt), stores "no logo" as null
 * rather than leaving it out, and keeps the theme as untyped JSON — so
 * every row is checked against the same Zod schema the forms use. A row
 * that somehow holds a bad theme fails loudly here instead of reaching
 * a page.
 */

export function toSchool(row: SchoolRow): School {
  return schoolSchema.parse({
    id: row.id,
    name: row.name,
    theme: row.theme,
    logoUrl: row.logoUrl ?? undefined,
    showDepedLogo: row.showDepedLogo,
    notificationPreference: row.notificationPreference,
  });
}

/** The app's `School` → the columns Prisma writes. The reverse of `toSchool`. */
export function toSchoolData(school: School) {
  return {
    name: school.name,
    theme: school.theme,
    logoUrl: school.logoUrl ?? null,
    showDepedLogo: school.showDepedLogo,
    notificationPreference: school.notificationPreference,
  };
}

/** Prisma's error code for "the record you asked to update doesn't exist". */
const RECORD_NOT_FOUND = "P2025";

export function createPrismaSchoolRepository(db: PrismaClient = prisma): SchoolRepository {
  return {
    async list() {
      const rows = await db.school.findMany({ orderBy: { createdAt: "asc" } });
      return rows.map(toSchool);
    },
    async getById(id) {
      const row = await db.school.findUnique({ where: { id } });
      return row ? toSchool(row) : null;
    },
    async update(school) {
      try {
        const row = await db.school.update({
          where: { id: school.id },
          data: toSchoolData(school),
        });
        return toSchool(row);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === RECORD_NOT_FOUND) {
          return null;
        }
        throw error;
      }
    },
    async create(school) {
      // Idempotent by id, like the mock: a repeated create leaves the
      // existing row alone instead of failing on a duplicate primary key.
      const row = await db.school.upsert({
        where: { id: school.id },
        update: {},
        create: { id: school.id, ...toSchoolData(school) },
      });
      return toSchool(row);
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const schoolRepository = createPrismaSchoolRepository();
