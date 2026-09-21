import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
  as: Heading = "h1",
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  /**
   * A standalone page (like /design-system) is its own document, so its
   * PageHeader is the real h1. A page inside the authenticated shell
   * (src/app/(app)/...) already gets its h1 from the persistent top bar
   * title (Step 10) — pass "h2" there so the page doesn't end up with two
   * top-level headings carrying the same text.
   */
  as?: "h1" | "h2";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        {/* Grows a step at lg and again at 2xl — TopbarTitle (Step 10)
            started this pattern with sm:text-xl; every page heading should
            feel proportionate on a big monitor, not frozen at its 1280px
            size. See docs/APP-SHELL.md's "Big screens" section. */}
        <Heading className="font-heading text-2xl font-semibold text-foreground lg:text-3xl 2xl:text-4xl">
          {title}
        </Heading>
        {description ? (
          <p className="text-sm text-muted-foreground lg:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
