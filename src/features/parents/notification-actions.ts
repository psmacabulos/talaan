"use server";

import { refresh } from "next/cache";
import { notificationRepository, parentStudentLinkRepository } from "@/data/repositories";
import { SIGNED_OUT_MESSAGE } from "@/features/auth/messages";
import { getParentSession } from "@/lib/parent-session";

export type NotificationActionResult = { ok: true } | { ok: false; formError: string };

/**
 * Step 24's "mark read", for one notification. The notification is looked
 * up only within the parent's own school (Step 51), so another school's id
 * answers "no longer exists", like a made-up one. Within the school, it
 * must be for one of the parent's own linked children. `refresh()` because
 * this action doesn't touch a cookie (see `attendance/actions.ts`'s note).
 */
export async function markNotificationRead(id: string): Promise<NotificationActionResult> {
  const session = await getParentSession();
  if (!session) {
    return { ok: false, formError: SIGNED_OUT_MESSAGE };
  }

  const notification = await notificationRepository.getInSchool(session.schoolId, id);
  if (!notification) {
    return { ok: false, formError: "That notification no longer exists." };
  }

  const links = await parentStudentLinkRepository.listByParent(session.parentId);
  if (!links.some((link) => link.studentId === notification.studentId)) {
    return { ok: false, formError: "That notification isn't for your children." };
  }

  await notificationRepository.markRead(session.schoolId, id);
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
    await Promise.all(links.map((link) => notificationRepository.listByStudent(session.schoolId, link.studentId)))
  ).flat();

  // One read flag per notification, shared by every guardian of that child
  // (Step 20's Phase 1 model) — marking it read here clears it for all.
  for (const notification of notifications) {
    if (!notification.read) {
      await notificationRepository.markRead(session.schoolId, notification.id);
    }
  }

  refresh();
  return { ok: true };
}
