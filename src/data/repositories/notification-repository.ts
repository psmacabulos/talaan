import { newestNotificationFirst, type NotificationCursor } from "@/features/parents/notification-cursor";
import type { Notification } from "@/features/parents/types";
import { seedNotifications } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

/** One linked child, at the school their link was checked against (Step 53): what every parent read is limited to. */
export type LinkedChild = { schoolId: string; studentId: string };

export interface NotificationRepository {
  /** Every notification within a school. */
  listBySchool(schoolId: string): Promise<Notification[]>;
  /**
   * Up to `take` of one student's notifications, newest first (the id breaks
   * a tie), only within `schoolId`. With `before`, only those strictly older
   * than it: the next page of a parent's feed (Step 53.2).
   */
  listPageForStudent(
    schoolId: string,
    studentId: string,
    page: { before: NotificationCursor | null; take: number },
  ): Promise<Notification[]>;
  /** How many of one student's notifications are unread, counting no further than `cap`. */
  countUnreadForStudent(schoolId: string, studentId: string, cap: number): Promise<number>;
  /** Marks one notification read if it belongs to one of `children`. True when it does, read already or not. */
  markReadForChildren(children: LinkedChild[], id: string): Promise<boolean>;
  /** Marks every unread notification of `children` read, in one write. */
  markAllReadForChildren(children: LinkedChild[]): Promise<void>;
  /** One notification, only if it's `schoolId`'s (Step 51); another school's id answers null, like a made-up one. */
  getInSchool(schoolId: string, id: string): Promise<Notification | null>;
  /**
   * Appends a notification (Step 24's tap fan-out). Idempotent by `id`, the
   * same way `TapRepository.create` is — a tap synced twice must not notify
   * twice.
   */
  create(notification: Notification): Promise<Notification>;
}

function isForOneOf(children: LinkedChild[], notification: Notification): boolean {
  return children.some(
    (child) => child.studentId === notification.studentId && child.schoolId === notification.schoolId,
  );
}

export function createMockNotificationRepository(
  data: Notification[] = seedNotifications,
  options: { latencyMs?: number } = {},
): NotificationRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;

  return {
    async listBySchool(schoolId) {
      await simulateLatency(latencyMs);
      return data.filter((notification) => notification.schoolId === schoolId);
    },
    async listPageForStudent(schoolId, studentId, { before, take }) {
      await simulateLatency(latencyMs);
      return data
        .filter((notification) => notification.studentId === studentId && notification.schoolId === schoolId)
        .filter((notification) => !before || newestNotificationFirst(before, notification) < 0)
        .sort(newestNotificationFirst)
        .slice(0, take);
    },
    async countUnreadForStudent(schoolId, studentId, cap) {
      await simulateLatency(latencyMs);
      const unread = data.filter(
        (notification) =>
          notification.studentId === studentId && notification.schoolId === schoolId && !notification.read,
      );
      return Math.min(unread.length, cap);
    },
    async markReadForChildren(children, id) {
      await simulateLatency(latencyMs);
      const index = data.findIndex((notification) => notification.id === id && isForOneOf(children, notification));
      if (index === -1) return false;
      data[index] = { ...data[index], read: true };
      return true;
    },
    async markAllReadForChildren(children) {
      await simulateLatency(latencyMs);
      data.forEach((notification, index) => {
        if (!notification.read && isForOneOf(children, notification)) data[index] = { ...notification, read: true };
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
