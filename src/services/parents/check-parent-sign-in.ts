import type { ParentRepository } from "@/data/repositories";
import { TOO_MANY_TRIES_MESSAGE, WRONG_SIGN_IN_MESSAGE } from "@/features/auth/messages";
import { parentLoginSchema } from "@/features/parents/auth-schemas";
import type { Parent } from "@/features/parents/types";
import { parentThrottleKey, type LoginThrottle } from "@/services/auth/login-throttle";

export const INVALID_SIGN_IN_INPUT_MESSAGE = "Enter a valid email and password.";

/** Why a sign-in was refused, so the parent app's API (Step 53.3) can answer 400, 429 or 401. */
export type ParentSignInFailure = "invalid_input" | "too_many_tries" | "wrong_credentials";

export type ParentSignInResult =
  { ok: true; parent: Parent } | { ok: false; code: ParentSignInFailure; formError: string };

export type ParentSignInDeps = {
  parents: Pick<ParentRepository, "verifyPassword">;
  throttle: LoginThrottle;
  now: number;
};

/**
 * Checks a parent's email and password (Step 22), the same way staff
 * sign-in does (`checkStaffSignIn`): a locked email is refused before the
 * password is looked at, and a wrong password and an unknown email give the
 * same answer in the same time (the repository checks a decoy hash). 5 wrong
 * passwords for one email in 15 minutes lock it for 15 minutes, counted
 * apart from staff.
 */
export async function checkParentSignIn(input: unknown, deps: ParentSignInDeps): Promise<ParentSignInResult> {
  const parsed = parentLoginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input", formError: INVALID_SIGN_IN_INPUT_MESSAGE };

  const { email, password } = parsed.data;
  const key = parentThrottleKey(email);
  const tooMany: ParentSignInResult = { ok: false, code: "too_many_tries", formError: TOO_MANY_TRIES_MESSAGE };
  if (deps.throttle.isLocked(key, deps.now)) return tooMany;

  const parent = await deps.parents.verifyPassword(email, password);
  if (!parent) {
    const locked = deps.throttle.recordFailure(key, deps.now);
    return locked ? tooMany : { ok: false, code: "wrong_credentials", formError: WRONG_SIGN_IN_MESSAGE };
  }

  deps.throttle.recordSuccess(key);
  return { ok: true, parent };
}
