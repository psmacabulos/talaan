import Image from "next/image";
import { cn } from "@/lib/utils";

/** The first letters of up to two words — "Sta. Rita National High School" → "SR". */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/**
 * A school's brand mark wherever it appears outside the sidebar: its
 * uploaded logo, or a two-letter monogram from its name. The sidebar's own
 * SidebarBrand (src/components/app-shell/sidebar.tsx) renders the same
 * choice inline; this component serves the Step 25 schools list and the
 * add-school form's live preview.
 */
export function SchoolLogo({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl?: string;
  className?: string;
}) {
  if (logoUrl) {
    // Data-URL logos (Phase 1's storage) are served as-is by next/image —
    // it detects the data: prefix and disables optimization on its own.
    // Decorative: the school name always sits beside it.
    return (
      <Image
        src={logoUrl}
        alt=""
        width={40}
        height={40}
        className={cn("shrink-0 rounded-lg border border-border bg-card object-contain", className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-xs font-semibold text-primary-foreground",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
