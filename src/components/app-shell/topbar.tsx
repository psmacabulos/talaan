import type { Role, Staff } from "@/features/staff/types";
import type { School } from "@/features/schools/types";
import type { ThemeSelection } from "@/lib/theme/presets";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "./mobile-nav";
import { TopbarClock } from "./topbar-clock";
import { DevSwitcher } from "./dev-switcher";
import { SignOutButton } from "./sign-out-button";
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
  themeSelection,
  now,
  demoClock,
}: {
  userId: string;
  school: School | null;
  role: Role;
  staff: Staff[];
  schools: School[];
  themeSelection: ThemeSelection;
  /** The server's time when it built the page; the top bar's clock starts from it. */
  now: string;
  /** Whether DEMO_NOW pins the clock. */
  demoClock: boolean;
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
      <TopbarClock key={now} serverNow={now} pinned={demoClock} />
      {/* Light/dark stays at every width (Step 27.5): it's a per-person
          reading preference, as useful on a phone as on a desktop. The demo
          clock badge stays at every width too: a pinned clock must be
          obvious on any screen. The pinned time itself is the clock's. */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {demoClock ? (
          <span
            className="rounded-full bg-status-late-bg px-2.5 py-1 text-xs font-medium text-status-late"
            title="The app's clock is pinned by DEMO_NOW."
          >
            Demo clock
          </span>
        ) : null}
        <ThemeToggle />
      </div>
      {/* Dropped below sm so the clock always has room to breathe on a
          phone-width top bar — same reasoning as Step 10's identity chip. */}
      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        {role !== "teacher" && <ThemeDropdown selection={themeSelection} hasSchool={school !== null} />}
        {isDev ? (
          <DevSwitcher userId={userId} role={role} school={school} staff={staff} schools={schools} />
        ) : (
          <span className="max-w-64 truncate text-sm text-muted-foreground">
            {ROLE_LABEL[role]}
            {school ? `, ${school.name}` : ""}
          </span>
        )}
        <SignOutButton placement="topbar" />
      </div>
    </header>
  );
}
