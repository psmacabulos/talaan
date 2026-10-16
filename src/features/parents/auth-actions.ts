"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import {
  parentRepository,
  parentStudentLinkRepository,
  schoolRepository,
  studentRepository,
} from "@/data/repositories";
import { SIGNED_OUT_MESSAGE } from "@/features/auth/messages";
import { clearParentSession, getParentSession, setParentSession } from "@/lib/parent-session";
import { loginThrottle } from "@/services/auth/login-throttle";
import { checkParentSignIn } from "@/services/parents/check-parent-sign-in";
import { linkChildToParent, type LinkChildFieldErrors } from "@/services/parents/link-child-to-parent";
import { registerParent, type ParentSignupFieldErrors } from "@/services/parents/register-parent";
import type { LinkChildInput, ParentLoginInput, ParentSignupInput } from "./types";

export type ParentSignupActionResult =
  { ok: true } | { ok: false; formError?: string; fieldErrors?: ParentSignupFieldErrors };

export type ParentLoginActionResult = { ok: true } | { ok: false; formError: string };

export type LinkChildActionResult =
  { ok: true; studentName: string } | { ok: false; formError?: string; fieldErrors?: LinkChildFieldErrors };

/**
 * Step 22's signup. The rules live in `registerParent`
 * (src/services/parents/), shared with the parent app's API from Step 53.3;
 * this only signs the new account in and sends it to "link a child". A
 * parent account is only useful once a child is linked, though nothing
 * forces them to finish that today (see the (protected) home page's empty
 * state).
 */
export async function signUpParent(input: ParentSignupInput): Promise<ParentSignupActionResult> {
  const result = await registerParent(input, { parents: parentRepository });
  if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors };

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
    throttle: loginThrottle,
    now: Date.now(),
  });
  if (!result.ok) return { ok: false, formError: result.formError };

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

  const result = await linkChildToParent(session.parentId, input, {
    schools: schoolRepository,
    students: studentRepository,
    links: parentStudentLinkRepository,
  });
  if (!result.ok) {
    return "fieldErrors" in result
      ? { ok: false, fieldErrors: result.fieldErrors }
      : { ok: false, formError: result.formError };
  }

  refresh();
  return { ok: true, studentName: `${result.student.firstName} ${result.student.lastName}` };
}
