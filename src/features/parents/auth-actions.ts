"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { after } from "next/server";
import { parentPasswordResetRepository, parentRepository } from "@/data/repositories";
import { PARENT_EMAIL_UNAVAILABLE_MESSAGE, RESET_TOO_MANY_MESSAGE, SIGNED_OUT_MESSAGE } from "@/features/auth/messages";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import type { ForgotPasswordInput } from "@/features/auth/types";
import { clearParentSession, getParentSession, setParentSession } from "@/lib/parent-session";
import { clientAddressKey } from "@/lib/client-address";
import { canEmailPeople, emailSender } from "@/lib/email/email-sender";
import { sessionSecret } from "@/lib/env";
import {
  dailyEmailCap,
  parentAddressThrottle,
  parentResetEmailThrottle,
  parentSignInThrottle,
  parentSignUpThrottle,
  resetAddressThrottle,
} from "@/services/auth/login-throttle";
import { checkParentSignIn } from "@/services/parents/check-parent-sign-in";
import { linkChildToParent, type LinkChildFieldErrors } from "@/services/parents/link-child-to-parent";
import { confirmParentPasswordReset, startParentPasswordReset } from "@/services/parents/parent-password-reset";
import { registerParent, type ParentSignupFieldErrors } from "@/services/parents/register-parent";
import { wakePushWorker } from "@/services/push/push-worker";
import { parentResetPasswordSchema } from "./auth-schemas";
import type { LinkChildInput, ParentLoginInput, ParentResetPasswordInput, ParentSignupInput } from "./types";

export type ParentSignupActionResult =
  { ok: true } | { ok: false; formError?: string; fieldErrors?: ParentSignupFieldErrors };

export type ParentLoginActionResult = { ok: true } | { ok: false; formError: string };

export type LinkChildActionResult =
  { ok: true; studentName: string } | { ok: false; formError?: string; fieldErrors?: LinkChildFieldErrors };

/** Who the sign-in limits count this request against (`clientAddressKey`). */
async function requestAddress(): Promise<string | null> {
  return clientAddressKey((await headers()).get("x-forwarded-for"));
}

/**
 * Step 22's signup. The rules live in `registerParent`
 * (src/services/parents/), shared with the parent app's API from Step 53.3;
 * this only signs the new account in and sends it to "link a child". A
 * parent account is only useful once a child is linked, though nothing
 * forces them to finish that today (see the (protected) home page's empty
 * state).
 */
export async function signUpParent(input: ParentSignupInput): Promise<ParentSignupActionResult> {
  const result = await registerParent(input, {
    parents: parentRepository,
    signUpThrottle: parentSignUpThrottle,
    address: await requestAddress(),
    now: Date.now(),
  });
  if (!result.ok) {
    return "fieldErrors" in result
      ? { ok: false, fieldErrors: result.fieldErrors }
      : { ok: false, formError: result.formError };
  }

  await setParentSession(result.parent.id);
  refresh();
  redirect("/parent/link-child");
}

/**
 * Step 22's sign-in, deliberately vague about which of email or password
 * was wrong. `checkParentSignIn` holds the rules: the 5-tries limit (real
 * clock, never DEMO_NOW) and the same answer time for an unknown email.
 */
export async function signInParent(input: ParentLoginInput): Promise<ParentLoginActionResult> {
  const result = await checkParentSignIn(input, {
    parents: parentRepository,
    throttle: parentSignInThrottle,
    addressThrottle: parentAddressThrottle,
    address: await requestAddress(),
    now: Date.now(),
  });
  if (!result.ok) return { ok: false, formError: result.formError };

  await setParentSession(result.parent.id);
  redirect("/parent");
}

export type ParentForgotPasswordResult = { ok: true } | { ok: false; formError: string };

/**
 * The web portal's "Forgot your password?" (Step 55.6): the same service as
 * the app's, so the same limits and the same answer for every email. The
 * code is emailed in `after()`, once the answer has gone.
 */
export async function requestParentPasswordReset(input: ForgotPasswordInput): Promise<ParentForgotPasswordResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, formError: "Enter a valid email address." };

  const result = startParentPasswordReset(parsed.data.email, await requestAddress(), {
    parents: parentRepository,
    resets: parentPasswordResetRepository,
    sender: emailSender(),
    secret: sessionSecret(),
    canEmail: canEmailPeople(),
    now: new Date(),
    emailThrottle: parentResetEmailThrottle,
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
      return { ok: false, formError: PARENT_EMAIL_UNAVAILABLE_MESSAGE };
  }
}

export type ParentResetPasswordFieldErrors = Partial<Record<keyof ParentResetPasswordInput, string>>;

/** Only failure returns: on success `resetParentPassword` redirects instead. */
export type ParentResetPasswordResult = {
  ok: false;
  formError?: string;
  fieldErrors?: ParentResetPasswordFieldErrors;
};

/**
 * The code and the new password (Step 55.6). Every other browser and phone
 * is signed out by the new password; this browser is signed in with it,
 * and the parent is emailed that it changed.
 */
export async function resetParentPassword(
  email: string,
  input: ParentResetPasswordInput,
): Promise<ParentResetPasswordResult> {
  const parsed = parentResetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: ParentResetPasswordFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof ParentResetPasswordInput;
      fieldErrors[field] ??= issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const result = await confirmParentPasswordReset(
    { email, code: parsed.data.code, password: parsed.data.password },
    {
      parents: parentRepository,
      resets: parentPasswordResetRepository,
      sender: emailSender(),
      dailyCap: dailyEmailCap,
      secret: sessionSecret(),
      signInThrottle: parentSignInThrottle,
      addressThrottle: parentAddressThrottle,
      address: await requestAddress(),
      now: new Date(),
    },
  );
  if (!result.ok) {
    if (result.code !== "invalid_input") return { ok: false, formError: result.formError };
    // Only the email can fail here, since the form's own fields were checked above.
    return { ok: false, formError: result.fieldErrors.email ?? "Check the highlighted fields." };
  }

  after(result.notify);
  await setParentSession(result.parent.id);
  redirect("/parent");
}

export async function signOutParent(): Promise<void> {
  await clearParentSession();
  redirect("/parent/login");
}

/**
 * Step 22's "link a child", by the school, LRN, last name and birth date.
 * `linkChildToParent` holds the rules. Both the "no match" and "already
 * linked" errors come back as a `formError` here, following the same
 * convention `card-actions.ts` uses.
 */
export async function linkChild(input: LinkChildInput): Promise<LinkChildActionResult> {
  const session = await getParentSession();
  if (!session) {
    return { ok: false, formError: SIGNED_OUT_MESSAGE };
  }

  const result = await linkChildToParent(session.parentId, input);
  if (!result.ok) {
    return "fieldErrors" in result
      ? { ok: false, fieldErrors: result.fieldErrors }
      : { ok: false, formError: result.formError };
  }

  // The child's other guardians are told (Step 55.2); send their pushes now.
  if (result.noticesMade > 0) wakePushWorker();
  refresh();
  return { ok: true, studentName: `${result.student.firstName} ${result.student.lastName}` };
}
