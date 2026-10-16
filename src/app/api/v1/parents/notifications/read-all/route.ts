import { notificationRepository, parentStudentLinkRepository } from "@/data/repositories";
import { requireParent } from "@/features/parents/api-request";
import { markAllParentNotificationsRead } from "@/services/parents/notifications";

/** Marks every unread notification of the parent's linked children read, in one write (Step 53.4). */
export async function POST(request: Request) {
  const caller = await requireParent(request);
  if (caller instanceof Response) return caller;

  await markAllParentNotificationsRead(caller.parentId, {
    links: parentStudentLinkRepository,
    notifications: notificationRepository,
  });
  return new Response(null, { status: 204 });
}
