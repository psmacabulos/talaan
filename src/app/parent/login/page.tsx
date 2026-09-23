import { LoginArtPanel } from "@/features/auth/login-art-panel";
import { LoginMobileHeader } from "@/features/auth/login-mobile-header";
import { ParentLoginForm } from "@/features/parents/login-form";

/** Step 22's parent sign-in — a separate flow from the staff login at `/`. */
export default function ParentLoginPage() {
  return (
    <main className="grid min-h-screen flex-1 lg:grid-cols-[1.05fr_1fr]">
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
