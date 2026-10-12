import type { Notification } from "@/features/parents/types";
import { seedNotifications } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

export interface NotificationRepository {
  /** Every notification within a school. */
  listBySchool(schoolId: string): Promise<Notification[]>;
  /** Every notification for a given student, only within `schoolId` (a parent's feed is these, joined through their links). */
  listByStudent(schoolId: string, studentId: string): Promise<Notification[]>;
  /** One notification, only if it's `schoolId`'s (Step 51); another school's id answers null, like a made-up one. */
  getInSchool(schoolId: string, id: string): Promise<Notification | null>;
  /**
   * Appends a notification (Step 24's tap fan-out). Idempotent by `id`, the
   * same way `TapRepository.create` is — a tap synced twice must not notify
   * twice.
   */
  create(notification: Notification): Promise<Notification>;
  /** Marks one notification read, only within `schoolId`. Returns `null` if there's no such notification there. */
  markRead(schoolId: string, id: string): Promise<Notification | null>;
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
    async listByStudent(schoolId, studentId) {
      await simulateLatency(latencyMs);
      return data.filter((notification) => notification.studentId === studentId && notification.schoolId === schoolId);
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
    async markRead(schoolId, id) {
      await simulateLatency(latencyMs);
      const index = data.findIndex((notification) => notification.id === id && notification.schoolId === schoolId);
      if (index === -1) return null;
      data[index] = { ...data[index], read: true };
      return data[index];
    },
  };
}
