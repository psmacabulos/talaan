import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { LoginArtPanel } from "@/features/auth/login-art-panel";
import { LoginMobileHeader } from "@/features/auth/login-mobile-header";
import { PARENT_EMAIL_UNAVAILABLE_MESSAGE } from "@/features/auth/messages";
import { ParentForgotPasswordForm } from "@/features/parents/forgot-password-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { canEmailPeople } from "@/lib/email/email-sender";

export const metadata: Metadata = { title: "Reset your password" };

/**
 * A parent's "Forgot your password?" (Step 55.6), styled like the parent
 * sign-in page. While a live server can't send email yet, it says so
 * instead of offering a code that would never arrive.
 */
export default async function ParentForgotPasswordPage() {
  // Per request, not at build: EMAIL_SENDER can change with a restart, without a new build.
  await connection();
  const canEmail = canEmailPeople();

  return (
    <main className="relative grid min-h-screen flex-1 lg:grid-cols-[1.25fr_1fr] xl:grid-cols-[1.6fr_1fr]">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <LoginArtPanel />

      <section className="flex flex-col items-center justify-center bg-background px-6 py-16 sm:px-12 sm:py-20 lg:px-16">
        <div className="flex w-full max-w-sm flex-col gap-10">
          <LoginMobileHeader />

          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-2xl font-semibold text-foreground">Reset your password</h2>
            <p className="text-sm text-muted-foreground">
              {canEmail
                ? "Type the email you sign in with. We'll email you a 6-digit code to choose a new password."
                : PARENT_EMAIL_UNAVAILABLE_MESSAGE}
            </p>
          </div>

          {canEmail ? <ParentForgotPasswordForm /> : null}

          <Link href="/parent/login" className="w-fit text-sm text-link underline underline-offset-2">
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
