import type { Notification } from "@/features/parents/types";
import { seedNotifications } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

export interface NotificationRepository {
  /** Every notification within a school. */
  listBySchool(schoolId: string): Promise<Notification[]>;
  /** Every notification for a given student (a parent's feed is these, joined through their links). */
  listByStudent(studentId: string): Promise<Notification[]>;
  getById(id: string): Promise<Notification | null>;
  /**
   * Appends a notification (Step 24's tap fan-out). Idempotent by `id`, the
   * same way `TapRepository.create` is — a tap synced twice must not notify
   * twice.
   */
  create(notification: Notification): Promise<Notification>;
  /** Marks one notification read. Returns `null` if no notification with that id exists. */
  markRead(id: string): Promise<Notification | null>;
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
    async listByStudent(studentId) {
      await simulateLatency(latencyMs);
      return data.filter((notification) => notification.studentId === studentId);
    },
    async getById(id) {
      await simulateLatency(latencyMs);
      return data.find((notification) => notification.id === id) ?? null;
    },
    async create(notification) {
      await simulateLatency(latencyMs);
      if (!data.some((existing) => existing.id === notification.id)) {
        data.push(notification);
      }
      return notification;
    },
    async markRead(id) {
      await simulateLatency(latencyMs);
      const index = data.findIndex((notification) => notification.id === id);
      if (index === -1) return null;
      data[index] = { ...data[index], read: true };
      return data[index];
    },
  };
}

export const notificationRepository = createMockNotificationRepository();
