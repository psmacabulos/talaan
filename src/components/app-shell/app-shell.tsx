import type { ReactNode } from "react";
import type { Role, Staff } from "@/features/staff/types";
import type { School } from "@/features/schools/types";
import type { ThemeSelection } from "@/lib/theme/presets";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/skip-link";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  userId,
  role,
  school,
  staff,
  schools,
  themeSelection,
  children,
}: {
  userId: string;
  role: Role;
  school: School | null;
  staff: Staff[];
  schools: School[];
  themeSelection: ThemeSelection;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      <SkipLink />
      <Sidebar role={role} school={school} className="hidden lg:flex" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userId={userId}
          school={school}
          role={role}
          staff={staff}
          schools={schools}
          themeSelection={themeSelection}
        />
        {/* Below 2xl (1536px), full width — unchanged from Step 10. At 2xl
            and up, padding grows a step further and content stops at a
            generous but real cap instead of stretching into a single
            absurdly wide column on an ultrawide monitor — content still
            hugs the left edge (no mx-auto), matching the top bar above it
            rather than becoming a centered island. See docs/APP-SHELL.md's
            "Big screens" section for why capped-and-left, not infinite. */}
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="flex-1 outline-none px-4 py-6 sm:px-6 lg:px-8 lg:py-8 2xl:px-12 2xl:py-10"
        >
          <div className="w-full 2xl:max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
