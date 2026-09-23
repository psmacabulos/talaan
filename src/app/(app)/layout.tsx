import type { ReactNode } from "react";
import { getSession } from "@/lib/session";
import { schoolRepository, staffRepository } from "@/data/repositories";
import { getThemeOverride } from "@/lib/theme/theme-override";
import { resolveActiveTheme } from "@/lib/theme/active-theme";
import { DEFAULT_THEME_PRESET_ID } from "@/lib/theme/presets";
import { ThemePresetStyle } from "@/lib/theme/theme-preset-style";
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
  const overridePresetId = await getThemeOverride();

  // The dev switcher's full persona list — only fetched outside
  // production, since the switcher itself never renders there either
  // (see topbar.tsx).
  const [staff, schools] =
    process.env.NODE_ENV !== "production"
      ? await Promise.all([staffRepository.list(), schoolRepository.list()])
      : [[], []];

  // What the top-bar theme dropdown shows: the preset being previewed, if
  // any; otherwise "saved" — the school's own saved theme, which may be a
  // Step 26 custom brand color no named preset matches. A super admin with
  // no school in view has nothing saved, so it shows the app default.
  const themeSelection = overridePresetId ?? (school ? "saved" : DEFAULT_THEME_PRESET_ID);

  return (
    <>
      <ThemePresetStyle id="theme-preset-active" tokens={resolveActiveTheme(school, overridePresetId)} />
      <AppShell
        userId={session.userId}
        role={session.role}
        school={school}
        staff={staff}
        schools={schools}
        themeSelection={themeSelection}
      >
        {children}
      </AppShell>
    </>
  );
}
