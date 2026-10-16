import { notificationRepository, parentStudentLinkRepository } from "@/data/repositories";
import { requireParent } from "@/features/parents/api-request";
import { API_MESSAGES, apiError } from "@/features/parents/api-responses";
import { markParentNotificationRead } from "@/services/parents/notifications";

/**
 * Marks one notification read (Step 53.4), only if it's about one of the
 * parent's linked children. Anything else is 404, another parent's
 * included, never "forbidden". The read mark is shared by the child's
 * guardians.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireParent(request);
  if (caller instanceof Response) return caller;

  const { id } = await params;
  const marked = await markParentNotificationRead(caller.parentId, id, {
    links: parentStudentLinkRepository,
    notifications: notificationRepository,
  });
  if (!marked) return apiError("not_found", API_MESSAGES.notFound);
  return new Response(null, { status: 204 });
}
