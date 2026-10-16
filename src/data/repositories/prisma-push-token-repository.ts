import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isForeignKeyViolation, isUniqueViolation } from "./prisma-errors";
import type { PushTokenRepository } from "./push-token-repository";

export function createPrismaPushTokenRepository(db: PrismaClient = prisma): PushTokenRepository {
  return {
    async findByToken(token) {
      const row = await db.pushToken.findUnique({ where: { token } });
      return row ? { token: row.token, platform: row.platform, parentTokenId: row.parentTokenId } : null;
    },
    async replace({ id, token, platform, parentTokenId }) {
      try {
        // A batch, not an interactive transaction: one trip to the database,
        // so no pool connection is held between the two statements.
        await db.$transaction([
          db.pushToken.deleteMany({ where: { OR: [{ token }, { parentTokenId }] } }),
          db.pushToken.create({ data: { id, token, platform, parentTokenId } }),
        ]);
        return "saved";
      } catch (error) {
        // Two registrations at the same moment: the other one's row came first.
        if (isUniqueViolation(error)) return "clash";
        // The sign-in was signed out, or cleared as stale, between the check and this write.
        if (isForeignKeyViolation(error)) return "signed_out";
        throw error;
      }
    },
    async deleteForParentToken(parentTokenId) {
      await db.pushToken.deleteMany({ where: { parentTokenId } });
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const pushTokenRepository = createPrismaPushTokenRepository();
