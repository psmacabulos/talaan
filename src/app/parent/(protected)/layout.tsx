import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getParentSession } from "@/lib/parent-session";
import { BantayAralLogo } from "@/components/brand/bantay-aral-logo";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/skip-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { notificationRepository, studentRepository } from "@/data/repositories";
import { NotificationsBell } from "@/features/parents/notifications-bell";
import { parentLinks } from "@/features/parents/parent-links";
import { SignOutButton } from "@/features/parents/sign-out-button";
import { countParentUnread, listParentNotifications } from "@/services/parents/notifications";

/** How many of the newest notifications the bell shows. */
const BELL_ITEMS = 5;

/**
 * The parent portal's own protected shell — separate from `(app)`
 * (src/app/(app)/layout.tsx), which is staff-only and reads the staff
 * `Session` shape. Deliberately minimal for now, just enough chrome not to
 * feel bare: Step 23 ("Parent dashboard") replaces this with the real
 * parent shell (attendance summaries, history). `(protected)` is a route
 * group — it adds no path segment — so this guard covers every page under
 * it (currently `/parent` and `/parent/link-child`) without covering the
 * public `/parent/login` and `/parent/signup` siblings.
 */
export default async function ParentProtectedLayout({ children }: { children: ReactNode }) {
  const session = await getParentSession();
  if (!session) redirect("/parent/login");

  // The bell's items come from this layout so every parent page has them
  // without each page re-fetching; the server actions' `refresh()`
  // re-renders this layout too, which is how the badge updates after a
  // mark-read. Only the newest few and a capped count (Step 53.2): the
  // browser never receives the whole history.
  const deps = { links: parentLinks, students: studentRepository, notifications: notificationRepository };
  const { items } = await listParentNotifications(session.parentId, { limit: BELL_ITEMS }, deps);
  const unread = await countParentUnread(session.parentId, deps);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SkipLink />
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <Link
          href="/parent"
          className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <BantayAralLogo size="sm" />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationsBell items={items} unread={unread} />
          <SignOutButton />
        </div>
      </header>
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </main>
    </div>
  );
}
