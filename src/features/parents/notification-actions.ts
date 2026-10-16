"use server";

import { refresh } from "next/cache";
import { notificationRepository, parentStudentLinkRepository } from "@/data/repositories";
import { SIGNED_OUT_MESSAGE } from "@/features/auth/messages";
import { getParentSession } from "@/lib/parent-session";
import { markAllParentNotificationsRead, markParentNotificationRead } from "@/services/parents/notifications";

export type NotificationActionResult = { ok: true } | { ok: false; formError: string };

const deps = { links: parentStudentLinkRepository, notifications: notificationRepository };

/**
 * Step 24's "mark read", for one notification. `markParentNotificationRead`
 * marks it only if it's for one of the parent's linked children, at that
 * child's school (Step 53), so another parent's id or a made-up one gets the
 * same answer. `refresh()` because this action doesn't touch a cookie (see
 * `attendance/actions.ts`'s note).
 */
export async function markNotificationRead(id: string): Promise<NotificationActionResult> {
  const session = await getParentSession();
  if (!session) {
    return { ok: false, formError: SIGNED_OUT_MESSAGE };
  }

  if (!(await markParentNotificationRead(session.parentId, id, deps))) {
    return { ok: false, formError: "That notification no longer exists." };
  }

  refresh();
  return { ok: true };
}

/** Every unread notification of the parent's children, in one write. The read mark is shared by a child's guardians. */
export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  const session = await getParentSession();
  if (!session) {
    return { ok: false, formError: SIGNED_OUT_MESSAGE };
  }

  await markAllParentNotificationsRead(session.parentId, deps);
  refresh();
  return { ok: true };
}
