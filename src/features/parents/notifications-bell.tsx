"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatTapTime } from "@/features/attendance/status";
import { markAllNotificationsRead, markNotificationRead } from "./notification-actions";
import { countUnreadNotifications, notificationKindLabel } from "./notifications-data";
import type { ParentNotificationItem } from "./notifications-data";

const MAX_ITEMS = 5;

/**
 * Step 24's notification bell, rendered in the parent portal's header. The
 * data comes from the (server) protected layout, so this component only
 * handles the menu: a badge with the unread count on the trigger, the five
 * newest notifications, "Mark all as read", and a "View all" link to the
 * full feed page. Clicking an item marks it read without closing the menu
 * (a parent often clears several at once); the server actions' `refresh()`
 * updates the props in place.
 */
export function NotificationsBell({ items }: { items: ParentNotificationItem[] }) {
  const [isPending, startTransition] = useTransition();
  const unread = countUnreadNotifications(items);

  function markRead(id: string) {
    startTransition(() => {
      markNotificationRead(id);
    });
  }

  function markAllRead() {
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result.ok) {
        toast("All notifications marked as read");
      } else {
        toast.error(result.formError);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unread === 0 ? "Notifications" : `Notifications, ${unread} unread`}
          className="relative"
        >
          <Bell aria-hidden="true" />
          {unread > 0 ? (
            <span
              aria-hidden="true"
              className="absolute top-0 right-0 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center justify-between px-1.5 py-1">
          <DropdownMenuLabel className="p-0 font-heading text-sm font-semibold text-foreground">
            Notifications
          </DropdownMenuLabel>
          {unread > 0 ? (
            <DropdownMenuItem
              disabled={isPending}
              onSelect={(event) => {
                event.preventDefault();
                markAllRead();
              }}
              className="w-fit text-xs text-muted-foreground focus:text-accent-foreground"
            >
              Mark all as read
            </DropdownMenuItem>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-1.5 py-3 text-sm text-muted-foreground">
            No notifications yet. When the school has notifications on, each tap shows up here.
          </p>
        ) : (
          <>
            {items.slice(0, MAX_ITEMS).map(({ notification, student }) => (
              <DropdownMenuItem
                key={notification.id}
                onSelect={(event) => {
                  event.preventDefault();
                  markRead(notification.id);
                }}
                className="flex items-start gap-2 rounded-md px-1.5 py-1.5"
              >
                <span
                  aria-hidden="true"
                  className={
                    notification.read
                      ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-transparent"
                      : "mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                  }
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm text-foreground">
                    <span className="font-medium">{student.firstName}</span>{" "}
                    {notificationKindLabel(notification.kind)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTapTime(notification.tappedAt)}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/parent/notifications" className="justify-center">
                View all
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
