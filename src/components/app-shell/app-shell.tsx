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
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
