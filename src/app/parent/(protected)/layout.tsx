import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Nfc } from "lucide-react";
import { getParentSession } from "@/lib/parent-session";
import { SignOutButton } from "@/features/parents/sign-out-button";

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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <Link href="/parent" className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Nfc className="size-4" aria-hidden="true" />
          </span>
          <span className="font-heading text-base font-semibold text-foreground">Talaan</span>
        </Link>
        <SignOutButton />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
