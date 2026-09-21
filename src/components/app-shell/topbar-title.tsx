"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";

/**
 * Layouts can't read the current pathname (they don't rerender on
 * navigation), so the page title has to live in a small Client Component —
 * see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md's
 * "Pathname" caveat.
 */
export function TopbarTitle() {
  const segment = useSelectedLayoutSegment();
  const label = NAV_ITEMS.find((item) => item.segment === segment)?.label ?? "Talaan";

  return (
    <h1 className="min-w-0 flex-1 truncate font-heading text-lg font-semibold text-foreground sm:text-xl">
      {label}
    </h1>
  );
}
