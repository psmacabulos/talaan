import type { ReactNode } from "react";
import { getSession } from "@/lib/session";
import { schoolRepository } from "@/data/repositories";
import { AppShell } from "@/components/app-shell/app-shell";

/**
 * The authenticated shell every screen below renders inside (dashboard,
 * attendance, students, staff, tap station, schools). `(app)` is a route
 * group — it adds no path segment — and this stays a nested layout under
 * the existing root layout, not a second root layout.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  const school = session.schoolId ? await schoolRepository.getById(session.schoolId) : null;

  return (
    <AppShell role={session.role} school={school}>
      {children}
    </AppShell>
  );
}
