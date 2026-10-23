import type { Parent as ParentRow, PrismaClient } from "@/generated/prisma/client";
import { normalizeEmail } from "@/features/auth/schemas";
import { parentSchema } from "@/features/parents/schemas";
import type { Parent } from "@/features/parents/types";
import { prisma } from "@/lib/db";
import { decoyPasswordHash, hashPassword, passwordMatches } from "@/lib/password";
import type { ParentRepository } from "./parent-repository";
import { isUniqueViolation } from "./prisma-errors";

/** A database row → the app's own `Parent`. The password hash leaves this file only through `getForSession`, for the cookie's fingerprint. */
export function toParent(row: ParentRow): Parent {
  return parentSchema.parse({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    mobile: row.mobile,
    email: row.email,
  });
}

/** The app's `Parent` → the columns Prisma writes (the hash is added by `create`). The email is stored trimmed and in lower case. */
export function toParentData(parent: Parent) {
  return {
    firstName: parent.firstName,
    lastName: parent.lastName,
    mobile: parent.mobile,
    email: normalizeEmail(parent.email),
  };
}

export function createPrismaParentRepository(db: PrismaClient = prisma): ParentRepository {
  /**
   * Emails are stored in lower case (Step 53.1), so " Ana@Example.com "
   * finds "ana@example.com" with an exact match, which the unique email
   * index answers. A case-insensitive search couldn't use it.
   */
  function findRowByEmail(email: string) {
    return db.parent.findUnique({ where: { email: normalizeEmail(email) } });
  }

  return {
    async getById(id) {
      const row = await db.parent.findUnique({ where: { id } });
      return row ? toParent(row) : null;
    },
    async getForSession(id) {
      const row = await db.parent.findUnique({ where: { id } });
      return row ? { parent: toParent(row), passwordHash: row.passwordHash } : null;
    },
    async findByEmail(email) {
      const row = await findRowByEmail(email);
      return row ? toParent(row) : null;
    },
    async create(parent, password) {
      try {
        const row = await db.parent.upsert({
          where: { id: parent.id },
          update: {},
          create: { id: parent.id, ...toParentData(parent), passwordHash: await hashPassword(password) },
        });
        return toParent(row);
      } catch (error) {
        // Another sign-up saved this email first.
        if (isUniqueViolation(error)) return null;
        throw error;
      }
    },
    async verifyPassword(email, password) {
      const row = await findRowByEmail(email);
      // scrypt runs either way, against a decoy for an unknown email, so the
      // answer takes as long and doesn't give away who has an account.
      const matches = await passwordMatches(password, row?.passwordHash ?? (await decoyPasswordHash()));
      return row && matches ? toParent(row) : null;
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const parentRepository = createPrismaParentRepository();
