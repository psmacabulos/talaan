import type { ParentPasswordReset, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { ParentPasswordResetRepository, StoredParentReset } from "./parent-password-reset-repository";

/** Thrown inside `complete`'s transaction when another request used the code first, so nothing is written. */
class CodeAlreadyUsed extends Error {}

function toStoredReset(row: ParentPasswordReset): StoredParentReset {
  return {
    id: row.id,
    parentId: row.parentId,
    codeHash: row.codeHash,
    expiresAt: row.expiresAt.toISOString(),
    tries: row.tries,
    usedAt: row.usedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createPrismaParentPasswordResetRepository(db: PrismaClient = prisma): ParentPasswordResetRepository {
  return {
    async countRecent(parentId, since) {
      // The (parentId, createdAt) index answers both from this parent's rows only.
      await db.parentPasswordReset.deleteMany({ where: { parentId, createdAt: { lt: new Date(since) } } });
      return db.parentPasswordReset.count({ where: { parentId } });
    },
    async create(row, now) {
      await db.parentPasswordReset.create({
        data: { ...row, expiresAt: new Date(row.expiresAt), createdAt: new Date(now) },
      });
    },
    async newest(parentId, since) {
      const row = await db.parentPasswordReset.findFirst({
        where: { parentId, createdAt: { gte: new Date(since) } },
        orderBy: { createdAt: "desc" },
      });
      return row ? toStoredReset(row) : null;
    },
    async spendTry(id, now, maxTries) {
      // One statement: Postgres takes the row's lock, so tries sent at once
      // are counted one after another and never pass `maxTries`.
      const { count } = await db.parentPasswordReset.updateMany({
        where: { id, usedAt: null, expiresAt: { gt: new Date(now) }, tries: { lt: maxTries } },
        data: { tries: { increment: 1 } },
      });
      return count === 1;
    },
    async complete(id, parentId, passwordHash, now) {
      try {
        await db.$transaction(async (tx) => {
          // A second request with the same code waits here for the first to
          // commit, then matches nothing.
          const { count } = await tx.parentPasswordReset.updateMany({
            where: { id, parentId, usedAt: null },
            data: { usedAt: new Date(now) },
          });
          if (count !== 1) throw new CodeAlreadyUsed();
          await tx.parent.update({ where: { id: parentId }, data: { passwordHash } });
          // The cascade takes each phone's push address and its pending pushes.
          await tx.parentToken.deleteMany({ where: { parentId } });
          await tx.parentPasswordReset.deleteMany({ where: { parentId } });
        });
        return true;
      } catch (error) {
        if (error instanceof CodeAlreadyUsed) return false;
        throw error;
      }
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const parentPasswordResetRepository = createPrismaParentPasswordResetRepository();
