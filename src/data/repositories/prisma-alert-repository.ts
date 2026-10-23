import type { Alert as AlertRow, PrismaClient } from "@/generated/prisma/client";
import { alertSchema } from "@/features/attendance/schemas";
import type { Alert } from "@/features/attendance/types";
import { prisma } from "@/lib/db";
import type { AlertRepository } from "./alert-repository";
import { toTap } from "./prisma-tap-repository";

/** A database row → the app's own `Alert`. */
export function toAlert(row: AlertRow): Alert {
  return alertSchema.parse({
    id: row.id,
    schoolId: row.schoolId,
    tapId: row.tapId,
    studentId: row.studentId,
    type: row.type,
    createdAt: row.createdAt.toISOString(),
    acknowledged: row.acknowledged,
  });
}

/** The app's `Alert` → the columns Prisma writes. The reverse of `toAlert`. */
export function toAlertData(alert: Alert) {
  return {
    schoolId: alert.schoolId,
    tapId: alert.tapId,
    studentId: alert.studentId,
    type: alert.type,
    createdAt: new Date(alert.createdAt),
    acknowledged: alert.acknowledged,
  };
}

const NEWEST_FIRST = [{ createdAt: "desc" as const }, { id: "desc" as const }];

export function createPrismaAlertRepository(db: PrismaClient = prisma): AlertRepository {
  return {
    async listOpen(schoolId, limit) {
      // The (schoolId, acknowledged, createdAt) index answers both, and the
      // taps come in the same query (Step 57: no longer one query per alert).
      const where = { schoolId, acknowledged: false };
      const [rows, total] = await db.$transaction([
        db.alert.findMany({ where, include: { tap: true }, orderBy: NEWEST_FIRST, take: limit }),
        db.alert.count({ where }),
      ]);
      return { alerts: rows.map((row) => ({ ...toAlert(row), tap: toTap(row.tap) })), total };
    },
    async listForTaps(schoolId, tapIds) {
      if (tapIds.length === 0) return [];
      const rows = await db.alert.findMany({ where: { schoolId, tapId: { in: tapIds } } });
      return rows.map(toAlert);
    },
    async acknowledge(schoolId, alertId) {
      // Scoped by school, so another school's alert can't be touched by its
      // id. One already handled still counts: two principals clicking at once
      // both see it done.
      const { count } = await db.alert.updateMany({ where: { id: alertId, schoolId }, data: { acknowledged: true } });
      return count === 1;
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const alertRepository = createPrismaAlertRepository();
