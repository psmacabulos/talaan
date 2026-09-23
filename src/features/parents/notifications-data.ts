import {
  notificationRepository,
  parentStudentLinkRepository,
  studentRepository,
} from "@/data/repositories";
import type { Student } from "@/features/students/types";
import type { Notification } from "./types";

/** A notification joined with the child it's about, ready to render. */
export type ParentNotificationItem = { notification: Notification; student: Student };

/**
 * Everything a parent's bell and feed show: every notification for every
 * linked child, newest first, with the child's name alongside. Extracted
 * from the dashboard page's inline composition because two places need it
 * now (the bell in the protected layout, and the notifications page), and
 * CLAUDE.md wants logic in features, not pages.
 *
 * No dedupe is needed: `linkChild` refuses to link the same student twice,
 * so one link per student is already guaranteed by the data.
 */
export async function getParentNotifications(parentId: string): Promise<ParentNotificationItem[]> {
  const links = await parentStudentLinkRepository.listByParent(parentId);

  const students = await Promise.all(links.map((link) => studentRepository.getById(link.studentId)));
  const notificationsByStudent = await Promise.all(
    links.map((link) => notificationRepository.listByStudent(link.studentId)),
  );

  const items: ParentNotificationItem[] = [];
  links.forEach((link, index) => {
    const student = students[index];
    if (!student) return;
    for (const notification of notificationsByStudent[index]) {
      items.push({ notification, student });
    }
  });

  items.sort((a, b) => b.notification.tappedAt.localeCompare(a.notification.tappedAt));
  return items;
}

export function countUnreadNotifications(items: ParentNotificationItem[]): number {
  return items.filter((item) => !item.notification.read).length;
}

/** The plain-language verb a parent reads, e.g. "tapped in" — sentence case, matching the app's copy style. */
export function notificationKindLabel(kind: Notification["kind"]): string {
  return kind === "time_in" ? "tapped in" : "tapped out";
}
