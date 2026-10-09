import type { Notification as NotificationRow, PrismaClient } from "@/generated/prisma/client";
import { notificationSchema } from "@/features/parents/schemas";
import type { Notification } from "@/features/parents/types";
import { prisma } from "@/lib/db";
import type { NotificationRepository } from "./notification-repository";

/** A database row → the app's own `Notification`. */
export function toNotification(row: NotificationRow): Notification {
  return notificationSchema.parse({
    id: row.id,
    schoolId: row.schoolId,
    studentId: row.studentId,
    kind: row.kind,
    tappedAt: row.tappedAt.toISOString(),
    read: row.read,
  });
}

/** The app's `Notification` → the columns Prisma writes. */
export function toNotificationData(notification: Notification) {
  return {
    schoolId: notification.schoolId,
    studentId: notification.studentId,
    kind: notification.kind,
    tappedAt: new Date(notification.tappedAt),
    read: notification.read,
  };
}

const EARLIEST_FIRST = [{ tappedAt: "asc" as const }, { id: "asc" as const }];

export function createPrismaNotificationRepository(db: PrismaClient = prisma): NotificationRepository {
  return {
    async listBySchool(schoolId) {
      const rows = await db.notification.findMany({ where: { schoolId }, orderBy: EARLIEST_FIRST });
      return rows.map(toNotification);
    },
    async listByStudent(studentId) {
      const rows = await db.notification.findMany({ where: { studentId }, orderBy: EARLIEST_FIRST });
      return rows.map(toNotification);
    },
    async getById(id) {
      const row = await db.notification.findUnique({ where: { id } });
      return row ? toNotification(row) : null;
    },
    async create(notification) {
      const row = await db.notification.upsert({
        where: { id: notification.id },
        update: {},
        create: { id: notification.id, ...toNotificationData(notification) },
      });
      return toNotification(row);
    },
    async markRead(id) {
      // updateMany, like Step 37's deleteMany: an unknown id changes 0 rows
      // instead of throwing, and the interface promises `null` for that.
      const { count } = await db.notification.updateMany({ where: { id }, data: { read: true } });
      if (count === 0) return null;
      const row = await db.notification.findUniqueOrThrow({ where: { id } });
      return toNotification(row);
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const notificationRepository = createPrismaNotificationRepository();
