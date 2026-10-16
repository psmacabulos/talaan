import type { Notification as NotificationRow, PrismaClient } from "@/generated/prisma/client";
import { notificationSchema } from "@/features/parents/schemas";
import type { Notification } from "@/features/parents/types";
import { prisma } from "@/lib/db";
import type { LinkedChild, NotificationRepository } from "./notification-repository";

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
const NEWEST_FIRST = [{ tappedAt: "desc" as const }, { id: "desc" as const }];

/** Each linked child at their own link's school: never "any of these students at any of these schools". */
function oneOf(children: LinkedChild[]) {
  return children.map(({ schoolId, studentId }) => ({ schoolId, studentId }));
}

export function createPrismaNotificationRepository(db: PrismaClient = prisma): NotificationRepository {
  return {
    async listBySchool(schoolId) {
      const rows = await db.notification.findMany({ where: { schoolId }, orderBy: EARLIEST_FIRST });
      return rows.map(toNotification);
    },
    async listPageForStudent(schoolId, studentId, { before, take }) {
      // Read backwards along the (studentId, tappedAt) index. With a cursor,
      // the plain `lte` lets the index start at the cursor; the OR then drops
      // the cursor's own row and any same-millisecond row after it.
      const olderThanCursor = before
        ? {
            tappedAt: { lte: new Date(before.tappedAt) },
            OR: [
              { tappedAt: { lt: new Date(before.tappedAt) } },
              { tappedAt: new Date(before.tappedAt), id: { lt: before.id } },
            ],
          }
        : {};
      const rows = await db.notification.findMany({
        where: { studentId, schoolId, ...olderThanCursor },
        orderBy: NEWEST_FIRST,
        take,
      });
      return rows.map(toNotification);
    },
    async countUnreadForStudent(schoolId, studentId, cap) {
      // A count with `take` becomes COUNT(*) over a LIMIT. Without an order,
      // Prisma orders that by id, which makes Postgres sort every unread row
      // first. Newest first lets it walk the (studentId, tappedAt) index
      // backwards and stop at the cap.
      return db.notification.count({
        where: { studentId, schoolId, read: false },
        orderBy: [{ tappedAt: "desc" }],
        take: cap,
      });
    },
    async markReadForChildren(children, id) {
      if (children.length === 0) return false;
      const { count } = await db.notification.updateMany({
        where: { id, OR: oneOf(children) },
        data: { read: true },
      });
      return count > 0;
    },
    async markAllReadForChildren(children) {
      if (children.length === 0) return;
      await db.notification.updateMany({ where: { read: false, OR: oneOf(children) }, data: { read: true } });
    },
    async getInSchool(schoolId, id) {
      const row = await db.notification.findFirst({ where: { id, schoolId } });
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
  };
}

/** The one instance the rest of the app actually imports. */
export const notificationRepository = createPrismaNotificationRepository();
