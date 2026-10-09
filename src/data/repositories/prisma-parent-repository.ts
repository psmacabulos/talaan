import type { Parent as ParentRow, PrismaClient } from "@/generated/prisma/client";
import { parentSchema } from "@/features/parents/schemas";
import type { Parent } from "@/features/parents/types";
import { prisma } from "@/lib/db";
import { hashPassword, passwordMatches } from "@/lib/password";
import type { ParentRepository } from "./parent-repository";

/** A database row → the app's own `Parent`. The password hash never leaves this file. */
export function toParent(row: ParentRow): Parent {
  return parentSchema.parse({
    id: row.id,
    schoolId: row.schoolId,
    firstName: row.firstName,
    lastName: row.lastName,
    mobile: row.mobile,
    email: row.email,
  });
}

/** The app's `Parent` → the columns Prisma writes (the hash is added by `create`). */
export function toParentData(parent: Parent) {
  return {
    schoolId: parent.schoolId,
    firstName: parent.firstName,
    lastName: parent.lastName,
    mobile: parent.mobile,
    email: parent.email,
  };
}

const OLDEST_FIRST = [{ createdAt: "asc" as const }, { id: "asc" as const }];

export function createPrismaParentRepository(db: PrismaClient = prisma): ParentRepository {
  /** Case-insensitive, like the mock: "Ana@Example.com" finds "ana@example.com". */
  function findRowByEmail(email: string) {
    return db.parent.findFirst({ where: { email: { equals: email.trim(), mode: "insensitive" } } });
  }

  return {
    async listBySchool(schoolId) {
      const rows = await db.parent.findMany({ where: { schoolId }, orderBy: OLDEST_FIRST });
      return rows.map(toParent);
    },
    async getById(id) {
      const row = await db.parent.findUnique({ where: { id } });
      return row ? toParent(row) : null;
    },
    async findByEmail(email) {
      const row = await findRowByEmail(email);
      return row ? toParent(row) : null;
    },
    async create(parent, password) {
      const row = await db.parent.upsert({
        where: { id: parent.id },
        update: {},
        create: { id: parent.id, ...toParentData(parent), passwordHash: await hashPassword(password) },
      });
      return toParent(row);
    },
    async verifyPassword(email, password) {
      const row = await findRowByEmail(email);
      if (!row) return null;
      return (await passwordMatches(password, row.passwordHash)) ? toParent(row) : null;
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const parentRepository = createPrismaParentRepository();
