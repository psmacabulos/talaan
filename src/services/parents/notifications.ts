import type { NotificationRepository, ParentStudentLinkRepository, StudentRepository } from "@/data/repositories";
import {
  decodeNotificationCursor,
  encodeNotificationCursor,
  newestNotificationFirst,
} from "@/features/parents/notification-cursor";
import type { ParentNotificationItem } from "@/features/parents/notification-format";

/** One page of the feed (Step 53.2). */
export const NOTIFICATION_PAGE_SIZE = 30;

/** The most one page can ask for (Step 53.4): each child's query takes one more than this. */
export const MAX_NOTIFICATION_PAGE_SIZE = 50;

/** The unread count stops here: the bell shows "9+" from 10 up, so counting further is wasted work. */
export const UNREAD_COUNT_CAP = 10;

export type ParentNotificationsDeps = {
  links: Pick<ParentStudentLinkRepository, "listByParent">;
  students: Pick<StudentRepository, "getInSchool">;
  notifications: Pick<
    NotificationRepository,
    "listPageForStudent" | "countUnreadForStudent" | "markReadForChildren" | "markAllReadForChildren"
  >;
};

export type ParentNotificationsPage = {
  items: ParentNotificationItem[];
  /** Pass as `before` for the next, older page. Null when there's nothing older. */
  nextBefore: string | null;
};

/** The parent's linked children, each at their own link's school: the only notifications they can ever reach. */
async function linkedChildren(parentId: string, deps: Pick<ParentNotificationsDeps, "links">) {
  const links = await deps.links.listByParent(parentId);
  return links.map(({ schoolId, studentId }) => ({ schoolId, studentId }));
}

/**
 * One page of a parent's notifications, newest first, across all their
 * linked children (`docs/SCALING.md` 2.2), only the ones theirs to see
 * (Step 55.2). Each child gives at most `limit + 1` from below the cursor,
 * one after another; merged in the same order, the first `limit` are
 * exactly the page, and anything past it means there's an older page. A bad or missing `before` means the first page
 * (the API answers a bad one with 400 before it gets here).
 */
export async function listParentNotifications(
  parentId: string,
  page: { before?: string | null; limit?: number },
  deps: ParentNotificationsDeps,
): Promise<ParentNotificationsPage> {
  // Kept between 1 and 50 whoever asks: a negative `take` would reverse Prisma's order.
  const asked = page.limit;
  const limit =
    asked !== undefined && Number.isInteger(asked)
      ? Math.min(Math.max(asked, 1), MAX_NOTIFICATION_PAGE_SIZE)
      : NOTIFICATION_PAGE_SIZE;
  const before = decodeNotificationCursor(page.before);
  const links = await deps.links.listByParent(parentId);

  const merged: ParentNotificationItem[] = [];
  for (const link of links) {
    const student = await deps.students.getInSchool(link.schoolId, link.studentId);
    if (!student) continue;
    const notifications = await deps.notifications.listPageForStudent(link.schoolId, student.id, parentId, {
      before,
      take: limit + 1,
    });
    const { id, firstName, lastName } = student;
    for (const notification of notifications) merged.push({ notification, student: { id, firstName, lastName } });
  }

  merged.sort((a, b) => newestNotificationFirst(a.notification, b.notification));
  const items = merged.slice(0, limit);
  const last = items.at(-1);
  return { items, nextBefore: merged.length > limit && last ? encodeNotificationCursor(last.notification) : null };
}

/**
 * How many of the parent's notifications are unread, up to
 * `UNREAD_COUNT_CAP`. One capped count per child, one after another,
 * stopping once the cap is reached.
 */
export async function countParentUnread(
  parentId: string,
  deps: Pick<ParentNotificationsDeps, "links" | "notifications">,
): Promise<number> {
  let unread = 0;
  for (const child of await linkedChildren(parentId, deps)) {
    if (unread >= UNREAD_COUNT_CAP) break;
    unread += await deps.notifications.countUnreadForStudent(
      child.schoolId,
      child.studentId,
      parentId,
      UNREAD_COUNT_CAP - unread,
    );
  }
  return unread;
}

/**
 * Marks one notification read, only if it's for one of the parent's linked
 * children and theirs to see. False for any other id, another parent's
 * included, with no hint which. A tap's read mark is shared by the child's
 * guardians; a link notice is its one recipient's (`docs/NOTIFICATIONS.md`).
 */
export async function markParentNotificationRead(
  parentId: string,
  id: string,
  deps: Pick<ParentNotificationsDeps, "links" | "notifications">,
): Promise<boolean> {
  return deps.notifications.markReadForChildren(parentId, await linkedChildren(parentId, deps), id);
}

/** Marks every unread notification the parent can see read, in one write. */
export async function markAllParentNotificationsRead(
  parentId: string,
  deps: Pick<ParentNotificationsDeps, "links" | "notifications">,
): Promise<void> {
  await deps.notifications.markAllReadForChildren(parentId, await linkedChildren(parentId, deps));
}
