import { notificationRepository, parentStudentLinkRepository, studentRepository } from "@/data/repositories";
import type { ParentNotificationItem } from "./notification-format";

export { countUnreadNotifications, notificationKindLabel, type ParentNotificationItem } from "./notification-format";
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

  // Each child within their own link's school (Step 53): the school the
  // server checked when the child was linked, never one the browser sends.
  const students = await Promise.all(
    links.map((link) => studentRepository.getInSchool(link.schoolId, link.studentId)),
  );
  const notificationsByStudent = await Promise.all(
    links.map((link) => notificationRepository.listByStudent(link.schoolId, link.studentId)),
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
