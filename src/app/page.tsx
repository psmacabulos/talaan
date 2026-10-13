import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginArtPanel } from "@/features/auth/login-art-panel";
import { LoginMobileHeader } from "@/features/auth/login-mobile-header";
import { LoginForm } from "@/features/auth/login-form";
import { DemoShortcuts } from "@/features/auth/demo-shortcuts";
import { ThemeToggle } from "@/components/theme-toggle";
import { PRODUCT_NAME } from "@/lib/product";

/**
 * The login screen (docs/PLAN.md Step 12) — now the site's entry point,
 * replacing the Step 4-6 design-tokens demo that this route held
 * temporarily (that demo's job is now done by the real style guide at
 * /design-system, Step 7). No school lookup here on purpose: the app is
 * multi-tenant and this screen renders before any school is known, so
 * both the desktop art panel (login-art-panel.tsx) and the compact heading
 * below (mobile only) carry generic product branding, never one school's.
 */
export default async function LoginPage() {
  // Already signed in: straight to the dashboard, so a bookmark of this
  // page doesn't ask for the password again (Step 50.1).
  if (await getSession()) redirect("/dashboard");

  // The one-click demo accounts are for development only. In production
  // the form is the only way in.
  const showDemoShortcuts = process.env.NODE_ENV !== "production";

  return (
    <main className="relative grid min-h-screen flex-1 lg:grid-cols-[1.05fr_1fr]">
      {/* Light/dark before sign-in too (Step 27.5), in the form column's
          top corner, clear of both the art panel and the form. */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
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

          <LoginForm />
          {showDemoShortcuts && <DemoShortcuts />}

          <p className="text-center text-sm text-muted-foreground">
            Parent or guardian?{" "}
            <Link href="/parent/login" className="text-link underline underline-offset-2">
              Sign in here
            </Link>
          </p>

          <p className="text-center text-sm text-muted-foreground">{PRODUCT_NAME}</p>
        </div>
      </section>
    </main>
  );
}
