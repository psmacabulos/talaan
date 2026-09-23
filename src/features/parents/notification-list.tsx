"use client";

import { useTransition } from "react";
import { formatTapTime } from "@/features/attendance/status";
import { formatTapDate } from "./child-summary-card";
import { markNotificationRead } from "./notification-actions";
import { notificationKindLabel } from "./notifications-data";
import type { ParentNotificationItem } from "./notifications-data";
import type { Notification } from "./types";

/**
 * The full notification feed on /parent/notifications. A client component
 * only because an unread item is a button: clicking it marks it read via a
 * server action, whose `refresh()` swaps the item into its plain read form
 * in place. Items arrive newest-first from `getParentNotifications`; this
 * component only groups them by day for display.
 */
export function NotificationList({ items }: { items: ParentNotificationItem[] }) {
  const [isPending, startTransition] = useTransition();

  // One walk of the sorted list, pushing onto the current group while the
  // date stays the same — no `Set`s or re-sorting needed.
  const groups: { date: string; items: ParentNotificationItem[] }[] = [];
  for (const item of items) {
    const date = formatTapDate(item.notification.tappedAt);
    const last = groups[groups.length - 1];
    if (last && last.date === date) {
      last.items.push(item);
    } else {
      groups.push({ date, items: [item] });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.date}>
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {group.date}
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {group.items.map(({ notification, student }) => (
              <li key={notification.id}>
                {notification.read ? (
                  <div className="flex items-start gap-2 rounded-md px-3 py-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-transparent"
                    />
                    <NotificationRowContent
                      name={`${student.firstName} ${student.lastName}`}
                      kind={notification.kind}
                      time={formatTapTime(notification.tappedAt)}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() => {
                        markNotificationRead(notification.id);
                      })
                    }
                    className="flex w-full items-start gap-2 rounded-md bg-accent px-3 py-2.5 text-left transition-colors hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                    />
                    <NotificationRowContent
                      name={`${student.firstName} ${student.lastName}`}
                      kind={notification.kind}
                      time={formatTapTime(notification.tappedAt)}
                    />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function NotificationRowContent({
  name,
  kind,
  time,
}: {
  name: string;
  kind: Notification["kind"];
  time: string;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-sm text-foreground">
        <span className="font-medium">{name}</span> {notificationKindLabel(kind)}
      </span>
      <span className="text-xs text-muted-foreground">{time}</span>
    </span>
  );
}
