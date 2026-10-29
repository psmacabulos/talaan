import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    // A grid rather than a stack (Step 27.7): on a phone the action button
    // sits beside the title, and the description runs full width underneath
    // instead of squeezing into a narrow column. From 640px up the button
    // moves to the right of both lines, as before.
    <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1", className)}>
      {/* The page's one h1: since Step 59.9 the top bar shows the date and
          time, not a second copy of the title. Grows a step at lg and again
          at 2xl, so every page heading feels proportionate on a big monitor,
          not frozen at its 1280px size. See docs/APP-SHELL.md's "Big
          screens" section. */}
      <h1 className="col-start-1 row-start-1 font-heading text-2xl font-semibold wrap-break-word text-foreground lg:text-3xl 2xl:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="col-span-2 col-start-1 row-start-2 text-sm text-muted-foreground sm:col-span-1 lg:text-base">
          {description}
        </p>
      ) : null}
      {/* row-end, not row-span: Tailwind's row-span sets the whole
          grid-row shorthand, which would throw away row-start-1. */}
      {actions ? <div className="col-start-2 row-start-1 flex items-center gap-2 sm:row-end-3">{actions}</div> : null}
    </div>
  );
}
