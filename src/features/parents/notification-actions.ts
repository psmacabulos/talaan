"use server";

import { refresh } from "next/cache";
import { notificationRepository, parentStudentLinkRepository } from "@/data/repositories";
import { getParentSession } from "@/lib/parent-session";

export type NotificationActionResult = { ok: true } | { ok: false; formError: string };

/**
 * Step 24's notification actions. Both check that the notification being
 * touched belongs to a child of the signed-in parent — links are
 * school-scoped by construction (a parent belongs to one school), so link
 * membership plus a schoolId match is the full ownership check. The same
 * result-object convention as `auth-actions.ts`, and `refresh()` because
 * these actions don't touch a cookie (see `attendance/actions.ts`'s note).
 */
async function assertParentLinks(studentId: string, schoolId: string): Promise<boolean> {
  const session = await getParentSession();
  if (!session || session.schoolId !== schoolId) return false;
  const links = await parentStudentLinkRepository.listByParent(session.parentId);
  return links.some((link) => link.studentId === studentId);
}

export async function markNotificationRead(id: string): Promise<NotificationActionResult> {
  const notification = await notificationRepository.getById(id);
  if (!notification) {
    return { ok: false, formError: "That notification no longer exists." };
  }

  if (!(await assertParentLinks(notification.studentId, notification.schoolId))) {
    return { ok: false, formError: "That notification isn't for your children." };
  }

  await notificationRepository.markRead(id);
  refresh();
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  const session = await getParentSession();
  if (!session) {
    return { ok: false, formError: "Your session has expired — sign in again." };
  }

  const links = await parentStudentLinkRepository.listByParent(session.parentId);
  const notifications = (
    await Promise.all(links.map((link) => notificationRepository.listByStudent(link.studentId)))
  ).flat();

  // One read flag per notification, shared by every guardian of that child
  // (Step 20's Phase 1 model) — marking it read here clears it for all.
  for (const notification of notifications) {
    if (!notification.read) {
      await notificationRepository.markRead(notification.id);
    }
  }

  refresh();
  return { ok: true };
}
