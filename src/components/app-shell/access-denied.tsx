import Link from "next/link";
import { Lock } from "lucide-react";

/**
 * What a role sees when it reaches a page its own nav never linked to
 * (typing the URL directly) — a real, in-shell message rather than a
 * silent redirect or a generic 404. `reason` is written per call site so it
 * can name the actual role and page, not a boilerplate "access denied".
 *
 * Deliberately not built on EmptyState: that component's dashed border
 * reads as "empty, add something here", which is the wrong metaphor for a
 * permission boundary. Instead it's an unbounded, centered message for an
 * exceptional state, the way the staff area's error page once was.
 */
export function AccessDenied({ reason }: { reason: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
      <Lock className="size-10 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        {/* The page's h1: the top bar shows the date and time, not a title (Step 59.9). */}
        <h1 className="font-heading text-base font-semibold text-foreground">You don&apos;t have access to this page</h1>
        <p className="text-sm text-muted-foreground">{reason}</p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-sm text-sm font-medium text-link underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
