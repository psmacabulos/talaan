import { notificationRepository, studentRepository } from "@/data/repositories";
import { linksReadOnce, requireParent } from "@/features/parents/api-request";
import { API_MESSAGES, apiError, toNotificationJson } from "@/features/parents/api-responses";
import { decodeNotificationCursor } from "@/features/parents/notification-cursor";
import { countParentUnread, listParentNotifications } from "@/services/parents/notifications";

const WHOLE_NUMBER = /^\d+$/;

/**
 * The parent's feed (Step 53.4), newest first, `limit` at a time (30 when
 * left out, kept between 1 and 50), across all their linked children. Pass
 * `nextBefore` back as `before` for the next, older page. A `before` that
 * isn't one is a 400, not quietly the first page, so an app bug shows up.
 * An empty `before=` means the first page. `unreadCount` stops at 10.
 */
export async function GET(request: Request) {
  const caller = await requireParent(request);
  if (caller instanceof Response) return caller;

  const query = new URL(request.url).searchParams;
  const before = query.get("before") || null;
  if (before && !decodeNotificationCursor(before)) {
    return apiError("invalid_input", API_MESSAGES.invalidInput, { before: "Send nextBefore back exactly as it came" });
  }
  const rawLimit = query.get("limit");
  if (rawLimit !== null && !WHOLE_NUMBER.test(rawLimit)) {
    return apiError("invalid_input", API_MESSAGES.invalidInput, { limit: "Use a whole number from 1 to 50" });
  }

  const deps = { links: linksReadOnce(), students: studentRepository, notifications: notificationRepository };
  const page = await listParentNotifications(
    caller.parentId,
    { before, limit: rawLimit === null ? undefined : Number(rawLimit) },
    deps,
  );
  const unreadCount = await countParentUnread(caller.parentId, deps);
  return Response.json({
    notifications: page.items.map(toNotificationJson),
    unreadCount,
    nextBefore: page.nextBefore,
  });
}
