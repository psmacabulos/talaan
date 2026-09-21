import type { Role, Staff } from "@/features/staff/types";
import type { School } from "@/features/schools/types";
import type { ThemePresetId } from "@/lib/theme/presets";
import { MobileNav } from "./mobile-nav";
import { TopbarTitle } from "./topbar-title";
import { DevSwitcher } from "./dev-switcher";
import { ThemeDropdown } from "./theme-dropdown";

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super admin",
  principal: "Principal",
  teacher: "Teacher",
};

export function Topbar({
  userId,
  school,
  role,
  staff,
  schools,
  activePresetId,
}: {
  userId: string;
  school: School | null;
  role: Role;
  staff: Staff[];
  schools: School[];
  activePresetId: ThemePresetId;
}) {
  // The dev switcher is a stand-in for real login (Phase 2) — never
  // rendered in production, checked here (not just by which button a
  // parent happens to pass down) so there's no path to it existing on a
  // real deployment. The theme dropdown is a real, permanent feature
  // (CLAUDE.md: "keep it in demo builds"), so it isn't gated the same way.
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
      <MobileNav role={role} school={school} />
      <TopbarTitle />
      {/* Dropped below sm so the page title always has room to breathe on
          a phone-width top bar — same reasoning as Step 10's identity chip. */}
      <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
        {role !== "teacher" && <ThemeDropdown presetId={activePresetId} />}
        {isDev ? (
          <DevSwitcher userId={userId} role={role} school={school} staff={staff} schools={schools} />
        ) : (
          <span className="max-w-64 truncate text-sm text-muted-foreground">
            {ROLE_LABEL[role]}
            {school ? `, ${school.name}` : ""}
          </span>
        )}
      </div>
    </header>
  );
}
