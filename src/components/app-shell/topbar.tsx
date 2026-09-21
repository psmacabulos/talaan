import type { Role } from "@/features/staff/types";
import type { School } from "@/features/schools/types";
import { MobileNav } from "./mobile-nav";
import { TopbarTitle } from "./topbar-title";

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super admin",
  principal: "Principal",
  teacher: "Teacher",
};

export function Topbar({
  school,
  role,
}: {
  school: School | null;
  role: Role;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
      <MobileNav role={role} school={school} />
      <TopbarTitle />
      {/* Secondary identity info — dropped below sm so the page title
          always has room to breathe on a phone-width top bar. */}
      <span className="hidden max-w-64 shrink-0 truncate text-sm text-muted-foreground sm:block">
        {ROLE_LABEL[role]}
        {school ? `, ${school.name}` : ""}
      </span>
    </header>
  );
}
