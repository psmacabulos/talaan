import { z } from "zod";
import type { Notification } from "./types";

/**
 * Where a page of a parent's notifications ends: the last one shown. The
 * next page holds the ones strictly older, by `tappedAt` and then `id`, the
 * order the feed is sorted in.
 */
export type NotificationCursor = { tappedAt: string; id: string };

/**
 * The two shapes a notification id has: a lowercase UUID (every id the
 * server makes) or the seed's "notification-0001". Only these, because the
 * order of two ids with the same `tappedAt` must be the same in JavaScript
 * as in Postgres. Postgres's en_US collation skips hyphens on its first
 * pass ("ab" before "a-c", where JavaScript puts "a-c" first), so the two
 * agree only when the hyphens fall in the same places.
 */
const NOTIFICATION_ID = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|notification-\d{4})$/;

const cursorSchema = z.object({
  tappedAt: z.iso.datetime(),
  id: z.string().regex(NOTIFICATION_ID),
});

/**
 * The text that goes in `?before=` (and the API's `nextBefore`): opaque to
 * the app, base64url of `<tappedAt>|<id>`. Throws for a notification whose
 * id has another shape, which nothing makes today: a cursor that couldn't
 * be read back would quietly send "Show older" to the first page.
 */
export function encodeNotificationCursor(notification: Pick<Notification, "tappedAt" | "id">): string {
  const { tappedAt, id } = notification;
  if (!cursorSchema.safeParse({ tappedAt, id }).success) {
    throw new Error("A notification's time or id can't be used as a page cursor.");
  }
  return Buffer.from(`${tappedAt}|${id}`).toString("base64url");
}

/** The cursor in `?before=`, or null for anything else: a bad or missing one means the first page. */
export function decodeNotificationCursor(raw: string | null | undefined): NotificationCursor | null {
  if (!raw) return null;
  const [tappedAt, id, ...extra] = Buffer.from(raw, "base64url").toString("utf8").split("|");
  if (extra.length > 0) return null;
  const parsed = cursorSchema.safeParse({ tappedAt, id });
  return parsed.success ? parsed.data : null;
}

/**
 * Newest first, the id breaking a tie: the feed's one order. Plain `<`
 * comparisons, not `localeCompare`, to match Postgres's `ORDER BY id DESC`
 * for the ids above.
 */
export function newestNotificationFirst(
  a: Pick<Notification, "tappedAt" | "id">,
  b: Pick<Notification, "tappedAt" | "id">,
): number {
  const byTime = Date.parse(b.tappedAt) - Date.parse(a.tappedAt);
  if (byTime !== 0) return byTime;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}
