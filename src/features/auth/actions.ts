"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { staffRepository } from "@/data/repositories";
import { clientAddressKey } from "@/lib/client-address";
import { canEmailPeople, emailSender } from "@/lib/email/email-sender";
import { appUrl, sessionSecret } from "@/lib/env";
import { hashPassword } from "@/lib/password";
import { endStaffSession, startStaffSession } from "@/lib/session";
import { setDevSession } from "@/lib/session-actions";
import { clearThemeOverride } from "@/lib/theme/theme-override-actions";
import { sendCappedEmail } from "@/services/auth/capped-email";
import {
  dailyEmailCap,
  resetAddressThrottle,
  staffResetEmailThrottle,
  staffSignInThrottle,
  staffThrottleKey,
} from "@/services/auth/login-throttle";
import { passwordChangedEmail } from "@/services/auth/reset-emails";
import { readSetPasswordToken } from "@/services/auth/set-password-link";
import { startStaffPasswordReset } from "@/services/auth/staff-password-reset";
import { checkStaffSignIn } from "@/services/auth/staff-sign-in";
import {
  EMAIL_UNAVAILABLE_MESSAGE,
  FORGOT_PASSWORD_MESSAGE,
  LINK_USED_MESSAGE,
  RESET_TOO_MANY_MESSAGE,
} from "./messages";
import { forgotPasswordSchema, loginSchema, setPasswordSchema } from "./schemas";
import type { ForgotPasswordInput, LoginInput, SetPasswordInput } from "./types";

/** Only failure returns: on success `signIn` redirects instead. */
export type SignInResult = { ok: false; formError: string };

/**
 * The sign-in form (Step 50.1). Re-validates with the form's own
 * `loginSchema` (a Server Action can be called directly, not only from the
 * form), checks the password and the wrong-try limit
 * (src/services/auth/staff-sign-in.ts), then starts the signed session and
 * clears any theme preview left from whoever used this browser before.
 * The limit runs on the real clock, never DEMO_NOW.
 */
export async function signIn(input: LoginInput): Promise<SignInResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, formError: "Enter a valid email and password." };

  const result = await checkStaffSignIn(parsed.data, {
    staff: staffRepository,
    throttle: staffSignInThrottle,
    now: Date.now(),
  });
  if (!result.ok) return result;

  await startStaffSession(result.staffId);
  await clearThemeOverride();
  redirect("/dashboard");
}

export type ForgotPasswordResult = { ok: true } | { ok: false; formError: string };

/**
 * "Forgot your password?" (Step 55.5). Answers the same whether or not the
 * email has an account: the lookup and the email run in `after()`, once
 * the answer has gone (src/services/auth/staff-password-reset.ts). The
 * email and the network are read here, before that, since the request is
 * gone by then. The limits run on the real clock, never DEMO_NOW.
 */
export async function requestPasswordReset(input: ForgotPasswordInput): Promise<ForgotPasswordResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, formError: "Enter a valid email address." };
  if (!canEmailPeople()) return { ok: false, formError: FORGOT_PASSWORD_MESSAGE };

  const result = startStaffPasswordReset(parsed.data.email, clientAddressKey((await headers()).get("x-forwarded-for")), {
    staff: staffRepository,
    sender: emailSender(),
    secret: sessionSecret(),
    appUrl: appUrl(),
    now: new Date(),
    emailThrottle: staffResetEmailThrottle,
    addressThrottle: resetAddressThrottle,
    dailyCap: dailyEmailCap,
  });
  switch (result.outcome) {
    case "accepted":
      after(result.send);
      return { ok: true };
    case "too_many":
      return { ok: false, formError: RESET_TOO_MANY_MESSAGE };
    case "unavailable":
      return { ok: false, formError: EMAIL_UNAVAILABLE_MESSAGE };
  }
}

/** Sign out in the top bar and the mobile drawer: a plain form post, so it works before JavaScript loads. */
export async function signOut(): Promise<void> {
  await endStaffSession();
  await clearThemeOverride();
  redirect("/");
}

/**
 * Development only: the "Try the prototype as" buttons sign in as a demo
 * account with no password, through the dev switcher's own
 * `setDevSession`, which throws in production.
 */
export async function signInAsDemo(staffId: string): Promise<void> {
  await setDevSession(staffId);
  redirect("/dashboard");
}

export type SetPasswordFieldErrors = Partial<Record<keyof SetPasswordInput, string>>;

/** Only failure returns: on success `setPasswordWithLink` redirects instead. */
export type SetPasswordResult = { ok: false; formError?: string; fieldErrors?: SetPasswordFieldErrors };

/**
 * The /set-password page (Step 50.5). Validates the password again, reads
 * the link again (it may have expired, or been used in another tab, while
 * the page was open), stores the new hash and makes an invited account
 * active, then signs the person in. The new hash changes their password
 * fingerprint, so this link, and every browser signed in before, stop
 * working. Since Step 55.5 it also clears their sign-in lockout, and after
 * a reset (not a first password) emails them that the password changed.
 */
export async function setPasswordWithLink(token: string, input: SetPasswordInput): Promise<SetPasswordResult> {
  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: SetPasswordFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof SetPasswordInput;
      fieldErrors[field] ??= issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const staff = await readSetPasswordToken(token, { staff: staffRepository, secret: sessionSecret(), now: new Date() });
  if (!staff) return { ok: false, formError: LINK_USED_MESSAGE };

  await staffRepository.setPassword(staff.id, await hashPassword(parsed.data.password));
  staffSignInThrottle.recordSuccess(staffThrottleKey(staff.email));
  if (staff.status === "active") {
    const sender = emailSender();
    after(() =>
      sendCappedEmail(passwordChangedEmail(staff), "password changed email", {
        sender,
        dailyCap: dailyEmailCap,
        now: Date.now(),
      }),
    );
  }
  await startStaffSession(staff.id);
  await clearThemeOverride();
  redirect("/dashboard");
}
