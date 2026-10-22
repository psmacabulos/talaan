import { newestNotificationFirst, type NotificationCursor } from "@/features/parents/notification-cursor";
import type { FeedNotification, Notification, Parent } from "@/features/parents/types";
import { seedNotifications, seedParents } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

/** One linked child, at the school their link was checked against (Step 53): what every parent read is limited to. */
export type LinkedChild = { schoolId: string; studentId: string };

export interface NotificationRepository {
  /** Every notification within a school. */
  listBySchool(schoolId: string): Promise<Notification[]>;
  /**
   * Up to `take` of one student's notifications that `viewerParentId` may
   * see, newest first (the id breaks a tie), only within `schoolId`. With
   * `before`, only those strictly older than it: the next page of a parent's
   * feed (Step 53.2). A link notice comes with its linking parent's name.
   *
   * Every method that serves a parent takes `viewerParentId` (Step 55.2): a
   * tap's notification is every guardian's, a link notice only its
   * recipient's.
   */
  listPageForStudent(
    schoolId: string,
    studentId: string,
    viewerParentId: string,
    page: { before: NotificationCursor | null; take: number },
  ): Promise<FeedNotification[]>;
  /** How many of one student's notifications `viewerParentId` hasn't read, counting no further than `cap`. */
  countUnreadForStudent(schoolId: string, studentId: string, viewerParentId: string, cap: number): Promise<number>;
  /** Marks one notification read if it belongs to one of `children` and `viewerParentId` may see it. True when so, read already or not. */
  markReadForChildren(viewerParentId: string, children: LinkedChild[], id: string): Promise<boolean>;
  /** Marks every unread notification of `children` that `viewerParentId` may see read, in one write. */
  markAllReadForChildren(viewerParentId: string, children: LinkedChild[]): Promise<void>;
  /** One notification, only if it's `schoolId`'s (Step 51); another school's id answers null, like a made-up one. */
  getInSchool(schoolId: string, id: string): Promise<Notification | null>;
  /**
   * Appends a notification. Idempotent by `id`, so a tap synced twice must
   * not notify twice. Taps' notifications are written by the tap writers,
   * link notices by `ParentStudentLinkRepository.createWithNotices`.
   */
  create(notification: Notification): Promise<Notification>;
}

function isForOneOf(children: LinkedChild[], notification: Notification): boolean {
  return children.some(
    (child) => child.studentId === notification.studentId && child.schoolId === notification.schoolId,
  );
}

/** A tap's notification is every guardian's; a link notice only its recipient's (Step 55.2). */
export function isSeenBy(viewerParentId: string, notification: Notification): boolean {
  return notification.recipientParentId === null || notification.recipientParentId === viewerParentId;
}

export function createMockNotificationRepository(
  data: Notification[] = seedNotifications,
  options: { latencyMs?: number; parents?: Parent[] } = {},
): NotificationRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;
  const parents = options.parents ?? seedParents;

  function withAboutParent(notification: Notification): FeedNotification {
    if (notification.kind !== "guardian_linked") return { ...notification, aboutParent: null };
    const about = parents.find((parent) => parent.id === notification.aboutParentId);
    return { ...notification, aboutParent: about ? { firstName: about.firstName, lastName: about.lastName } : null };
  }

  return {
    async listBySchool(schoolId) {
      await simulateLatency(latencyMs);
      return data.filter((notification) => notification.schoolId === schoolId);
    },
    async listPageForStudent(schoolId, studentId, viewerParentId, { before, take }) {
      await simulateLatency(latencyMs);
      return data
        .filter((notification) => notification.studentId === studentId && notification.schoolId === schoolId)
        .filter((notification) => isSeenBy(viewerParentId, notification))
        .filter((notification) => !before || newestNotificationFirst(before, notification) < 0)
        .sort(newestNotificationFirst)
        .slice(0, take)
        .map(withAboutParent);
    },
    async countUnreadForStudent(schoolId, studentId, viewerParentId, cap) {
      await simulateLatency(latencyMs);
      const unread = data.filter(
        (notification) =>
          notification.studentId === studentId &&
          notification.schoolId === schoolId &&
          !notification.read &&
          isSeenBy(viewerParentId, notification),
      );
      return Math.min(unread.length, cap);
    },
    async markReadForChildren(viewerParentId, children, id) {
      await simulateLatency(latencyMs);
      const index = data.findIndex(
        (notification) =>
          notification.id === id && isForOneOf(children, notification) && isSeenBy(viewerParentId, notification),
      );
      if (index === -1) return false;
      data[index] = { ...data[index], read: true };
      return true;
    },
    async markAllReadForChildren(viewerParentId, children) {
      await simulateLatency(latencyMs);
      data.forEach((notification, index) => {
        if (!notification.read && isForOneOf(children, notification) && isSeenBy(viewerParentId, notification)) {
          data[index] = { ...notification, read: true };
        }
      });
    },
    async getInSchool(schoolId, id) {
      await simulateLatency(latencyMs);
      return data.find((notification) => notification.id === id && notification.schoolId === schoolId) ?? null;
    },
    async create(notification) {
      await simulateLatency(latencyMs);
      if (!data.some((existing) => existing.id === notification.id)) {
        data.push(notification);
      }
      return notification;
    },
  };
}
