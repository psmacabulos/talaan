import type { AuditEvent as AuditRow, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { AuditDetails, AuditEvent } from "@/features/audit/types";
import type { AuditRepository } from "./audit-repository";

function toAuditEvent(row: AuditRow): AuditEvent {
  return {
    id: row.id,
    action: row.action,
    actorId: row.actorId,
    actorRole: row.actorRole,
    targetType: row.targetType,
    targetId: row.targetId,
    // Written only by `recordAudit`, which keeps `fields` to the allowed names.
    details: row.details as AuditDetails | null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createPrismaAuditRepository(db: PrismaClient = prisma): AuditRepository {
  return {
    async record({ schoolId, actor, action, targetType, targetId, details }) {
      await db.auditEvent.create({
        data: { schoolId, actorId: actor.id, actorRole: actor.role, action, targetType, targetId, details },
      });
    },
    async listPage(schoolId, { actions, before, limit }) {
      const rows = await db.auditEvent.findMany({
        where: {
          schoolId,
          ...(actions ? { action: { in: [...actions] } } : {}),
          // Keyset paging on the index's own order: older than the cursor's
          // time, or the same time and a smaller id.
          ...(before
            ? {
                OR: [
                  { createdAt: { lt: new Date(before.createdAt) } },
                  { createdAt: new Date(before.createdAt), id: { lt: before.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
      });
      return rows.map(toAuditEvent);
    },
    async deleteOlderThan(before, limit) {
      // Deleting needs ids first: Prisma has no "delete ... limit". The
      // createdAt index finds them without reading the table.
      const old = await db.auditEvent.findMany({
        where: { createdAt: { lt: new Date(before) } },
        select: { id: true },
        orderBy: { createdAt: "asc" },
        take: limit,
      });
      if (old.length === 0) return 0;
      const { count } = await db.auditEvent.deleteMany({ where: { id: { in: old.map((row) => row.id) } } });
      return count;
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const auditRepository = createPrismaAuditRepository();
