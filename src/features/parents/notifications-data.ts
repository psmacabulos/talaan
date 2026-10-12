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

export async function getParentNotifications(parentId: string, schoolId: string): Promise<ParentNotificationItem[]> {
  const links = await parentStudentLinkRepository.listByParent(parentId);

  // Only the parent's own school (Step 51): a link can only ever point
  // there, and the school comes from the signed session, never the link.
  const students = await Promise.all(links.map((link) => studentRepository.getInSchool(schoolId, link.studentId)));
  const notificationsByStudent = await Promise.all(
    links.map((link) => notificationRepository.listByStudent(schoolId, link.studentId)),
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
