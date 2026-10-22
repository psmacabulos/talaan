import type { Notification as NotificationRow, PrismaClient } from "@/generated/prisma/client";
import { notificationSchema } from "@/features/parents/schemas";
import type { FeedNotification, Notification } from "@/features/parents/types";
import { prisma } from "@/lib/db";
import type { LinkedChild, NotificationRepository } from "./notification-repository";

/** A database row → the app's own `Notification`. The union's parse rejects a tap with a recipient, or a link notice without one. */
export function toNotification(row: NotificationRow): Notification {
  const base = {
    id: row.id,
    schoolId: row.schoolId,
    studentId: row.studentId,
    tappedAt: row.tappedAt.toISOString(),
    read: row.read,
    recipientParentId: row.recipientParentId,
  };
  return notificationSchema.parse(
    row.kind === "guardian_linked"
      ? { ...base, kind: row.kind, aboutParentId: row.aboutParentId }
      : { ...base, kind: row.kind },
  );
}

/** The app's `Notification` → the columns Prisma writes. */
export function toNotificationData(notification: Notification) {
  return {
    schoolId: notification.schoolId,
    studentId: notification.studentId,
    kind: notification.kind,
    tappedAt: new Date(notification.tappedAt),
    read: notification.read,
    recipientParentId: notification.recipientParentId,
    aboutParentId: notification.kind === "guardian_linked" ? notification.aboutParentId : null,
  };
}

/** A tap's notification is every guardian's; a link notice only its recipient's (Step 55.2). */
function seenBy(viewerParentId: string) {
  return { OR: [{ recipientParentId: null }, { recipientParentId: viewerParentId }] };
}

/** Only the linking parent's two names, never their email or mobile. */
const ABOUT_PARENT_NAME = { aboutParent: { select: { firstName: true, lastName: true } } } as const;

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
    async listPageForStudent(schoolId, studentId, viewerParentId, { before, take }) {
      // Read backwards along the (studentId, tappedAt) index. With a cursor,
      // the plain `lte` lets the index start at the cursor; the OR then drops
      // the cursor's own row and any same-millisecond row after it. The
      // viewer's filter is checked on each row as the index is walked.
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
        where: { studentId, schoolId, AND: [seenBy(viewerParentId), olderThanCursor] },
        orderBy: NEWEST_FIRST,
        take,
        include: ABOUT_PARENT_NAME,
      });
      return rows.map((row): FeedNotification => ({ ...toNotification(row), aboutParent: row.aboutParent }));
    },
    async countUnreadForStudent(schoolId, studentId, viewerParentId, cap) {
      // A count with `take` becomes COUNT(*) over a LIMIT. Without an order,
      // Prisma orders that by id, which makes Postgres sort every unread row
      // first. Newest first lets it walk the (studentId, tappedAt) index
      // backwards and stop at the cap.
      return db.notification.count({
        where: { studentId, schoolId, read: false, ...seenBy(viewerParentId) },
        orderBy: [{ tappedAt: "desc" }],
        take: cap,
      });
    },
    async markReadForChildren(viewerParentId, children, id) {
      if (children.length === 0) return false;
      const { count } = await db.notification.updateMany({
        where: { id, AND: [{ OR: oneOf(children) }, seenBy(viewerParentId)] },
        data: { read: true },
      });
      return count > 0;
    },
    async markAllReadForChildren(viewerParentId, children) {
      if (children.length === 0) return;
      await db.notification.updateMany({
        where: { read: false, AND: [{ OR: oneOf(children) }, seenBy(viewerParentId)] },
        data: { read: true },
      });
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
