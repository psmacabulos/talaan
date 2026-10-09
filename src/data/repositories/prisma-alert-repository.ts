import type { Alert as AlertRow, PrismaClient } from "@/generated/prisma/client";
import { alertSchema } from "@/features/attendance/schemas";
import type { Alert } from "@/features/attendance/types";
import { prisma } from "@/lib/db";
import type { AlertRepository } from "./alert-repository";

/** A database row → the app's own `Alert`. */
export function toAlert(row: AlertRow): Alert {
  return alertSchema.parse({
    id: row.id,
    schoolId: row.schoolId,
    tapId: row.tapId,
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
    type: alert.type,
    createdAt: new Date(alert.createdAt),
    acknowledged: alert.acknowledged,
  };
}

export function createPrismaAlertRepository(db: PrismaClient = prisma): AlertRepository {
  return {
    async listBySchool(schoolId) {
      const rows = await db.alert.findMany({ where: { schoolId }, orderBy: { createdAt: "asc" } });
      return rows.map(toAlert);
    },
    async create(alert) {
      const row = await db.alert.upsert({
        where: { id: alert.id },
        update: {},
        create: { id: alert.id, ...toAlertData(alert) },
      });
      return toAlert(row);
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const alertRepository = createPrismaAlertRepository();
