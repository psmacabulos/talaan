"use server";

import { redirect } from "next/navigation";
import { staffRepository } from "@/data/repositories";
import { sessionSecret } from "@/lib/env";
import { hashPassword } from "@/lib/password";
import { endStaffSession, startStaffSession } from "@/lib/session";
import { setDevSession } from "@/lib/session-actions";
import { clearThemeOverride } from "@/lib/theme/theme-override-actions";
import { loginThrottle } from "@/services/auth/login-throttle";
import { readSetPasswordToken } from "@/services/auth/set-password-link";
import { checkStaffSignIn } from "@/services/auth/staff-sign-in";
import { LINK_USED_MESSAGE } from "./messages";
import { loginSchema, setPasswordSchema } from "./schemas";
import type { LoginInput, SetPasswordInput } from "./types";

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
    throttle: loginThrottle,
    now: Date.now(),
  });
  if (!result.ok) return result;

  await startStaffSession(result.staffId);
  await clearThemeOverride();
  redirect("/dashboard");
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
 * working.
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
  await startStaffSession(staff.id);
  await clearThemeOverride();
  redirect("/dashboard");
}
