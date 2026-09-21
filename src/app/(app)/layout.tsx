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

  // The theme dropdown only offers the 5 named presets (Step 21 adds a
  // real "Custom" picker) — a school already on a custom brand color has
  // no exact match here, so this falls back to the app default rather
  // than guessing. No seed school is on "custom" yet, so this doesn't
  // come up in practice today.
  const activePresetId =
    overridePresetId ?? (school?.theme.kind === "preset" ? school.theme.presetId : DEFAULT_THEME_PRESET_ID);

  return (
    <>
      <ThemePresetStyle id="theme-preset-active" tokens={resolveActiveTheme(school, overridePresetId)} />
      <AppShell
        userId={session.userId}
        role={session.role}
        school={school}
        staff={staff}
        schools={schools}
        activePresetId={activePresetId}
      >
        {children}
      </AppShell>
    </>
  );
}
