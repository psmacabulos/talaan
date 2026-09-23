import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { getParentSession } from "@/lib/parent-session";
import { MarkAllReadButton } from "@/features/parents/mark-all-read-button";
import { NotificationList } from "@/features/parents/notification-list";
import {
  countUnreadNotifications,
  getParentNotifications,
} from "@/features/parents/notifications-data";

/**
 * Step 24's full notification feed. The protected layout already fetched the
 * bell's five most recent items; the page fetches the complete list the same
 * way (mock data is tiny, so no pagination yet — real pagination arrives
 * with Phase 2's database). "Mark all as read" only shows while something
 * is unread; it would be a dead button otherwise.
 */
export default async function NotificationsPage() {
  const session = await getParentSession();
  if (!session) redirect("/parent/login");

  const items = await getParentNotifications(session.parentId);
  const unread = countUnreadNotifications(items);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title="Notifications"
        description="Every time your child taps in or out, it shows up here."
        actions={unread > 0 ? <MarkAllReadButton /> : undefined}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="When the school has notifications on, each tap shows up here."
        />
      ) : (
        <NotificationList items={items} />
      )}
    </div>
  );
}
