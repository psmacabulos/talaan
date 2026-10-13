import type { Metadata } from "next";
import Link from "next/link";
import { staffRepository } from "@/data/repositories";
import { LoginArtPanel } from "@/features/auth/login-art-panel";
import { LoginMobileHeader } from "@/features/auth/login-mobile-header";
import { LINK_USED_MESSAGE } from "@/features/auth/messages";
import { SetPasswordForm } from "@/features/auth/set-password-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { sessionSecret } from "@/lib/env";
import { readSetPasswordToken } from "@/services/auth/set-password-link";

export const metadata: Metadata = { title: "Set your password" };

/**
 * Where a set-password link lands (Step 50.5): a new staff member's first
 * password, or a reset. Styled like the sign-in screen and, like it, never
 * shows a school's name or logo: the page shows only the person's own first
 * name, so a guessed or stale link reveals nothing about any school.
 */
export default async function SetPasswordPage({ searchParams }: PageProps<"/set-password">) {
  const { token } = await searchParams;
  const raw = typeof token === "string" ? token : undefined;
  const staff = await readSetPasswordToken(raw, { staff: staffRepository, secret: sessionSecret(), now: new Date() });

  return (
    <main className="relative grid min-h-screen flex-1 lg:grid-cols-[1.05fr_1fr]">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <LoginArtPanel />

      <section className="flex flex-col items-center justify-center bg-background px-6 py-16 sm:px-12 sm:py-20 lg:px-16">
        <div className="flex w-full max-w-sm flex-col gap-10">
          <LoginMobileHeader />

          {staff && raw ? (
            <>
              <div className="flex flex-col gap-2">
                <h2 className="font-heading text-2xl font-semibold text-foreground">
                  Set your password, {staff.firstName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  You&apos;ll use it with your email, {staff.email}, to sign in from now on.
                </p>
              </div>
              <SetPasswordForm token={raw} />
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <h2 className="font-heading text-2xl font-semibold text-foreground">
                This link doesn&apos;t work any more
              </h2>
              <p className="text-sm text-muted-foreground">{LINK_USED_MESSAGE}</p>
              <Link href="/" className="w-fit text-sm text-link underline underline-offset-2">
                Go to sign in
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
