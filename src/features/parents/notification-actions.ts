"use server";

import { refresh } from "next/cache";
import { notificationRepository, parentStudentLinkRepository } from "@/data/repositories";
import { SIGNED_OUT_MESSAGE } from "@/features/auth/messages";
import { getParentSession } from "@/lib/parent-session";

export type NotificationActionResult = { ok: true } | { ok: false; formError: string };

/**
 * Step 24's "mark read", for one notification. It's looked up only within
 * the schools of the parent's own links (Step 53), so any other school's id
 * answers "no longer exists", like a made-up one. Within that school, it
 * must be for one of the parent's own linked children. `refresh()` because
 * this action doesn't touch a cookie (see `attendance/actions.ts`'s note).
 */
export async function markNotificationRead(id: string): Promise<NotificationActionResult> {
  const session = await getParentSession();
  if (!session) {
    return { ok: false, formError: SIGNED_OUT_MESSAGE };
  }

  const links = await parentStudentLinkRepository.listByParent(session.parentId);
  const schoolIds = [...new Set(links.map((link) => link.schoolId))];
  const found = await Promise.all(schoolIds.map((schoolId) => notificationRepository.getInSchool(schoolId, id)));
  const notification = found.find((candidate) => candidate !== null);
  if (!notification) {
    return { ok: false, formError: "That notification no longer exists." };
  }

  if (!links.some((link) => link.schoolId === notification.schoolId && link.studentId === notification.studentId)) {
    return { ok: false, formError: "That notification isn't for your children." };
  }

  await notificationRepository.markRead(notification.schoolId, id);
  refresh();
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  const session = await getParentSession();
  if (!session) {
    return { ok: false, formError: SIGNED_OUT_MESSAGE };
  }

  const links = await parentStudentLinkRepository.listByParent(session.parentId);
  const notifications = (
    await Promise.all(links.map((link) => notificationRepository.listByStudent(link.schoolId, link.studentId)))
  ).flat();

  // One read flag per notification, shared by every guardian of that child
  // (Step 20's Phase 1 model) — marking it read here clears it for all.
  for (const notification of notifications) {
    if (!notification.read) {
      await notificationRepository.markRead(notification.schoolId, notification.id);
    }
  }

  refresh();
  return { ok: true };
}
