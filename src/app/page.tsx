import { LoginArtPanel } from "@/features/auth/login-art-panel";
import { LoginMobileHeader } from "@/features/auth/login-mobile-header";
import { LoginForm } from "@/features/auth/login-form";
import { DemoShortcuts } from "@/features/auth/demo-shortcuts";

/**
 * The login screen (docs/PLAN.md Step 12) — now the site's entry point,
 * replacing the Step 4-6 design-tokens demo that this route held
 * temporarily (that demo's job is now done by the real style guide at
 * /design-system, Step 7). No school lookup here on purpose: Talaan is
 * multi-tenant and this screen renders before any school is known, so
 * both the desktop art panel (login-art-panel.tsx) and the compact heading
 * below (mobile only) carry generic product branding, never one school's.
 */
export default function LoginPage() {
  // Signing in only actually sets a session outside development — Phase 1
  // has no real accounts yet, so this mirrors the Step 11 dev switcher's
  // own production guard (setDevSession throws there). See login-form.tsx
  // and demo-shortcuts.tsx for what happens when this is false.
  const signInEnabled = process.env.NODE_ENV !== "production";

  return (
    <div className="grid min-h-screen flex-1 lg:grid-cols-[1.05fr_1fr]">
      <LoginArtPanel />

      <section className="flex flex-col items-center justify-center bg-background px-6 py-16 sm:px-12 sm:py-20 lg:px-16">
        <div className="flex w-full max-w-sm flex-col gap-10">
          {/* Below lg, LoginArtPanel is hidden entirely (see its own
              `hidden lg:flex`) rather than stacking its full decorative
              panel above the form — this compact card takes its place. */}
          <LoginMobileHeader />

          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-2xl font-semibold text-foreground">Sign in</h2>
            <p className="text-sm text-muted-foreground">Use the account your school gave you.</p>
          </div>

          <LoginForm signInEnabled={signInEnabled} />
          <DemoShortcuts signInEnabled={signInEnabled} />

          <p className="text-center text-sm text-muted-foreground">
            Talaan (placeholder product name)
          </p>
        </div>
      </section>
    </div>
  );
}
