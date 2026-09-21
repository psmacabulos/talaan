import type { ReactNode } from "react";
import type { Role } from "@/features/staff/types";
import type { School } from "@/features/schools/types";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  role,
  school,
  children,
}: {
  role: Role;
  school: School | null;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar role={role} school={school} className="hidden lg:flex" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar school={school} role={role} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
