import type { Parent as ParentRow, PrismaClient } from "@/generated/prisma/client";
import { normalizeEmail } from "@/features/auth/schemas";
import { parentSchema } from "@/features/parents/schemas";
import type { Parent } from "@/features/parents/types";
import { prisma } from "@/lib/db";
import { decoyPasswordHash, hashPassword, passwordMatches } from "@/lib/password";
import type { ParentRepository } from "./parent-repository";
import { isDeadlock, isUniqueViolation, retryOnce } from "./prisma-errors";

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

/** How long deleting an account waits for a free connection, then to finish. */
const DELETE_TRANSACTION = { maxWait: 5_000, timeout: 10_000 };

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
    async deleteAccount(parentId) {
      // Run again once if it deadlocks with a school removing this parent from a child (Step 60.2).
      return retryOnce(
        () =>
          db.$transaction(async (tx) => {
            // Locked first, so a link-a-child waits for this and then finds no parent.
            await tx.$queryRaw`SELECT 1 FROM "Parent" WHERE "id" = ${parentId} FOR UPDATE`;
            const parent = await tx.parent.findUnique({ where: { id: parentId }, select: { id: true } });
            // A double click, or another phone: already deleted.
            if (!parent) return false;

            const links = await tx.parentStudentLink.findMany({
              where: { parentId },
              select: { schoolId: true, studentId: true },
            });
            // One event per child, in that child's own school, with no actor: a
            // parent who asked to be deleted leaves no id behind.
            if (links.length > 0) {
              await tx.auditEvent.createMany({
                data: links.map((link) => ({
                  schoolId: link.schoolId,
                  action: "parent_account_deleted" as const,
                  targetType: "student" as const,
                  targetId: link.studentId,
                })),
              });
            }
            // Links before the parent, as `removeInSchool` does: the push fan-out holds
            // FOR SHARE on these rows, so this waits for one in progress, and the
            // deliveries it wrote go with the parent's tokens below. The link is
            // `onDelete: Restrict`, so it has to go first anyway.
            await tx.parentStudentLink.deleteMany({ where: { parentId } });
            // Cascades their sign-ins and push addresses, reset codes, school blocks and
            // the notices addressed to them; notices about them lose only their name.
            await tx.parent.delete({ where: { id: parentId } });
            return true;
          }, DELETE_TRANSACTION),
        isDeadlock,
      );
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const parentRepository = createPrismaParentRepository();
