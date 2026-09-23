import { LoginArtPanel } from "@/features/auth/login-art-panel";
import { LoginMobileHeader } from "@/features/auth/login-mobile-header";
import { ParentLoginForm } from "@/features/parents/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

/** Step 22's parent sign-in — a separate flow from the staff login at `/`. */
export default function ParentLoginPage() {
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
          <LoginMobileHeader />

          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-2xl font-semibold text-foreground">Parent sign in</h2>
            <p className="text-sm text-muted-foreground">Sign in to see your child&apos;s attendance.</p>
          </div>

          <ParentLoginForm />
        </div>
      </section>
    </main>
  );
}
