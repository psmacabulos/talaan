import type { ReactNode } from "react";
import type { Role, Staff } from "@/features/staff/types";
import type { School } from "@/features/schools/types";
import type { ThemePresetId } from "@/lib/theme/presets";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  userId,
  role,
  school,
  staff,
  schools,
  activePresetId,
  children,
}: {
  userId: string;
  role: Role;
  school: School | null;
  staff: Staff[];
  schools: School[];
  activePresetId: ThemePresetId;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar role={role} school={school} className="hidden lg:flex" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userId={userId}
          school={school}
          role={role}
          staff={staff}
          schools={schools}
          activePresetId={activePresetId}
        />
        {/* Below 2xl (1536px), full width — unchanged from Step 10. At 2xl
            and up, padding grows a step further and content stops at a
            generous but real cap instead of stretching into a single
            absurdly wide column on an ultrawide monitor — content still
            hugs the left edge (no mx-auto), matching the top bar above it
            rather than becoming a centered island. See docs/APP-SHELL.md's
            "Big screens" section for why capped-and-left, not infinite. */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 2xl:px-12 2xl:py-10">
          <div className="w-full 2xl:max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
