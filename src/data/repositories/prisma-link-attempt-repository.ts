import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { LinkAttemptRepository } from "./link-attempt-repository";

export function createPrismaLinkAttemptRepository(db: PrismaClient = prisma): LinkAttemptRepository {
  return {
    async record({ schoolId, keyHash, at }) {
      const row = await db.linkAttempt.create({ data: { schoolId, keyHash, createdAt: new Date(at) } });
      return row.id;
    },
    async countSince(keyHash, since) {
      // The (keyHash, createdAt) index answers this from one child's rows only.
      return db.linkAttempt.count({ where: { keyHash, createdAt: { gte: new Date(since) } } });
    },
    async remove(id) {
      await db.linkAttempt.deleteMany({ where: { id } });
    },
    async deleteOlderThan(before) {
      const { count } = await db.linkAttempt.deleteMany({ where: { createdAt: { lt: new Date(before) } } });
      return count;
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const linkAttemptRepository = createPrismaLinkAttemptRepository();
