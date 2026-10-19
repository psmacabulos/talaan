import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { ParentTokenRepository } from "./parent-token-repository";

export function createPrismaParentTokenRepository(db: PrismaClient = prisma): ParentTokenRepository {
  return {
    async create(token, tokenHash, now) {
      await db.parentToken.create({
        data: { id: token.id, parentId: token.parentId, label: token.label, tokenHash, lastUsedAt: new Date(now) },
      });
    },
    async findByHash(tokenHash) {
      const row = await db.parentToken.findUnique({ where: { tokenHash } });
      if (!row) return null;
      return {
        id: row.id,
        parentId: row.parentId,
        lastUsedAt: row.lastUsedAt.toISOString(),
        revokedAt: row.revokedAt?.toISOString() ?? null,
      };
    },
    async touch(id, now, olderThan) {
      // The condition makes many requests at once write at most once.
      await db.parentToken.updateMany({
        where: { id, lastUsedAt: { lt: new Date(olderThan) } },
        data: { lastUsedAt: new Date(now) },
      });
    },
    async revoke(id, now) {
      await db.parentToken.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date(now) } });
    },
    async deleteStale(parentId, usedBefore) {
      await db.parentToken.deleteMany({
        where: {
          parentId,
          OR: [{ revokedAt: { not: null } }, { lastUsedAt: { lt: new Date(usedBefore) }, pushToken: { is: null } }],
        },
      });
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const parentTokenRepository = createPrismaParentTokenRepository();
