import Image from "next/image";
import { School as SchoolIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/features/staff/types";
import type { School } from "@/features/schools/types";
import { NavLinks } from "./nav-links";

/**
 * Shared by the static sidebar (this file) and the mobile drawer
 * (mobile-nav.tsx) so the "who am I looking at" header is identical on
 * both. A school with an uploaded logo (Step 25) shows it here; otherwise
 * an icon badge stands in.
 */
export function SidebarBrand({ school }: { school: School | null }) {
  return (
    <div className="flex items-center gap-3 px-2">
      {school?.logoUrl ? (
        // A Step 25 logo upload is stored as a data URL, which Next's
        // image component detects and serves as-is (unoptimized) — there's
        // nothing to optimize, and the fixed size box means no layout
        // shift. The school's name sits right beside it, so the image
        // itself is decorative.
        <Image
          src={school.logoUrl}
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-lg border border-border bg-card object-contain"
        />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <SchoolIcon className="size-5" aria-hidden="true" />
        </span>
      )}
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-heading text-sm font-semibold text-foreground">
          {school?.name ?? "Talaan"}
        </span>
        <span className="text-xs text-muted-foreground">
          {school ? "Attendance portal" : "All schools"}
        </span>
      </div>
    </div>
  );
}

export function Sidebar({
  role,
  school,
  className,
}: {
  role: Role;
  school: School | null;
  className?: string;
}) {
  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        "w-64 shrink-0 flex-col gap-6 border-r border-border bg-card px-4 py-6",
        className,
      )}
    >
      <SidebarBrand school={school} />
      <NavLinks role={role} className="flex-1" />
    </aside>
  );
}
