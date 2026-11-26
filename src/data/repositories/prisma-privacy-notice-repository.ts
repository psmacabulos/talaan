import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { PrivacyNoticeRepository } from "./privacy-notice-repository";
import { isUniqueViolation } from "./prisma-errors";

/** More versions than a school will ever publish; the list stays one small read. */
const VERSIONS_SHOWN = 50;

export function createPrismaPrivacyNoticeRepository(db: PrismaClient = prisma): PrivacyNoticeRepository {
  return {
    async current(schoolId) {
      // The unique (schoolId, version) index, read backwards: one row.
      const row = await db.privacyNotice.findFirst({ where: { schoolId }, orderBy: { version: "desc" } });
      return row
        ? { schoolId: row.schoolId, version: row.version, body: row.body, publishedAt: row.publishedAt.toISOString() }
        : null;
    },

    async versions(schoolId) {
      const rows = await db.privacyNotice.findMany({
        where: { schoolId },
        orderBy: { version: "desc" },
        // Never the text: up to 20 KB each, and the list only shows dates.
        select: { version: true, publishedAt: true },
        take: VERSIONS_SHOWN,
      });
      return rows.map((row) => ({ version: row.version, publishedAt: row.publishedAt.toISOString() }));
    },

    async publish(schoolId, body, basedOnVersion, actor) {
      try {
        return await db.$transaction(async (tx) => {
          const newest = await tx.privacyNotice.findFirst({
            where: { schoolId },
            orderBy: { version: "desc" },
            select: { version: true },
          });
          // Someone published meanwhile, or the number was made up: either
          // way, writing basedOnVersion + 1 would skip or repeat a version.
          if ((newest?.version ?? 0) !== basedOnVersion) return { ok: false, reason: "stale" } as const;

          const version = basedOnVersion + 1;
          await tx.privacyNotice.create({ data: { schoolId, version, body } });
          // In the same transaction, not through the best-effort recordAudit:
          // who published the text parents accept must not be lost.
          await tx.auditEvent.create({
            data: {
              schoolId,
              actorId: actor.id,
              actorRole: actor.role,
              action: "privacy_notice_published",
              targetType: "school",
              targetId: schoolId,
            },
          });
          return { ok: true, version } as const;
        });
      } catch (error) {
        // Two publishes from the same version at once both pass the check
        // above; the unique (schoolId, version) refuses the second, which
        // aborts its transaction, so the answer is given out here.
        if (isUniqueViolation(error)) return { ok: false, reason: "stale" };
        throw error;
      }
    },
  };
}

export const privacyNoticeRepository = createPrismaPrivacyNoticeRepository();
