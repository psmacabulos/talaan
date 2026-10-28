"use client";

import { useTransition } from "react";
import { formatTapTime } from "@/features/attendance/status";
import { formatSchoolDate } from "@/lib/school-time";
import { markNotificationRead } from "./notification-actions";
import { LINK_NOTICE_ADVICE, linkedBy, notificationKindLabel } from "./notification-format";
import type { ParentNotificationItem } from "./notification-format";
import type { ParentName } from "./types";

/**
 * The full notification feed on /parent/notifications. A client component
 * only because an unread item is a button: clicking it marks it read via a
 * server action, whose `refresh()` swaps the item into its plain read form
 * in place. Items arrive newest-first, one page at a time, from `listParentNotifications`; this
 * component only groups them by day for display.
 */
export function NotificationList({ items }: { items: ParentNotificationItem[] }) {
  const [isPending, startTransition] = useTransition();

  // One walk of the sorted list, pushing onto the current group while the
  // date stays the same — no `Set`s or re-sorting needed.
  const groups: { date: string; items: ParentNotificationItem[] }[] = [];
  for (const item of items) {
    const date = formatSchoolDate(item.notification.tappedAt);
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
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.date}</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {group.items.map((item) => (
              <li key={item.notification.id}>
                {item.notification.read ? (
                  <div className="flex items-start gap-2 rounded-md px-3 py-2.5">
                    <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-transparent" />
                    <NotificationRowContent item={item} />
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() => {
                        markNotificationRead(item.notification.id);
                      })
                    }
                    className="flex w-full items-start gap-2 rounded-md bg-accent px-3 py-2.5 text-left transition-colors hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <NotificationRowContent item={item} />
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

function NotificationRowContent({ item: { notification, student } }: { item: ParentNotificationItem }) {
  const childName = `${student.firstName} ${student.lastName}`;
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-sm text-foreground">
        {notification.kind === "guardian_linked" ? (
          <LinkNoticeText childName={childName} aboutParent={notification.aboutParent} />
        ) : (
          <>
            <span className="font-medium">{childName}</span> {notificationKindLabel(notification.kind)}
          </>
        )}
      </span>
      <span className="text-xs text-muted-foreground">{formatTapTime(notification.tappedAt)}</span>
    </span>
  );
}

/** Step 55.2: "An account named Ana Santos linked to Juan Cruz. If you don't know them, contact the school." */
function LinkNoticeText({ childName, aboutParent }: { childName: string; aboutParent: ParentName | null }) {
  const { lead, name } = linkedBy(aboutParent);
  return (
    <>
      {lead}
      {name && (
        <>
          {" "}
          <span className="font-medium">{name}</span>
        </>
      )}{" "}
      linked to <span className="font-medium">{childName}</span>. {LINK_NOTICE_ADVICE}
    </>
  );
}
