import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { LoginArtPanel } from "@/features/auth/login-art-panel";
import { LoginMobileHeader } from "@/features/auth/login-mobile-header";
import { FORGOT_PASSWORD_MESSAGE } from "@/features/auth/messages";
import { ThemeToggle } from "@/components/theme-toggle";
import { canEmailPeople } from "@/lib/email/email-sender";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Reset your password" };

/**
 * "Forgot your password?" for staff (Step 55.5), styled like the sign-in
 * screen, and like it, never one school's. While a live server can't send
 * email yet, it says who to ask instead (Step 50.5's note).
 */
export default async function ForgotPasswordPage() {
  if (await getSession()) redirect("/dashboard");

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
              {canEmailPeople()
                ? "Type the email you sign in with. We'll email you a link to choose a new password."
                : FORGOT_PASSWORD_MESSAGE}
            </p>
          </div>

          {canEmailPeople() ? <ForgotPasswordForm /> : null}

          <Link href="/" className="w-fit text-sm text-link underline underline-offset-2">
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
