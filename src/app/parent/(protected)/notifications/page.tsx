import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { notificationRepository, studentRepository } from "@/data/repositories";
import { getParentSession } from "@/lib/parent-session";
import { MarkAllReadButton } from "@/features/parents/mark-all-read-button";
import { NotificationList } from "@/features/parents/notification-list";
import { decodeNotificationCursor } from "@/features/parents/notification-cursor";
import { parentLinks } from "@/features/parents/parent-links";
import { countParentUnread, listParentNotifications } from "@/services/parents/notifications";

/**
 * Step 24's notification feed, one page at a time (Step 53.2): the newest
 * 30, then "Show older" for the 30 before those. Where a page starts is in
 * the address (`?before=`), so the back button and a shared link work. A
 * bad `before` shows the first page. "Mark all as read" shows while anything
 * is unread, on any page, not only the one in view.
 */
export default async function NotificationsPage({ searchParams }: PageProps<"/parent/notifications">) {
  const session = await getParentSession();
  if (!session) redirect("/parent/login");

  const { before } = await searchParams;
  // A bad or missing cursor is simply the first page.
  const cursor = typeof before === "string" && decodeNotificationCursor(before) ? before : null;
  const deps = { links: parentLinks, students: studentRepository, notifications: notificationRepository };
  const page = await listParentNotifications(session.parentId, { before: cursor }, deps);
  const unread = await countParentUnread(session.parentId, deps);
  const isFirstPage = cursor === null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title="Notifications"
        description="Every time your child taps in or out, it shows up here."
        actions={unread > 0 ? <MarkAllReadButton /> : undefined}
      />
      {page.items.length === 0 && isFirstPage ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="When the school has notifications on, each tap shows up here."
        />
      ) : (
        <>
          {page.items.length > 0 ? (
            <NotificationList items={page.items} />
          ) : (
            <p className="text-sm text-muted-foreground">There are no older notifications.</p>
          )}
          {isFirstPage && !page.nextBefore ? null : (
            <nav aria-label="More notifications" className="flex flex-wrap items-center gap-3">
              {isFirstPage ? null : (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/parent/notifications">Back to newest</Link>
                </Button>
              )}
              {page.nextBefore ? (
                <Button asChild variant="outline" size="sm" className="ml-auto">
                  {/* The cursor is base64url, so it needs no escaping in an address. */}
                  <Link href={`/parent/notifications?before=${page.nextBefore}`}>Show older</Link>
                </Button>
              ) : null}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
