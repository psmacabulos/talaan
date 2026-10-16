import type { StaffRepository } from "@/data/repositories";
import { decoyPasswordHash, passwordMatches } from "@/lib/password";
import { TOO_MANY_TRIES_MESSAGE, WRONG_SIGN_IN_MESSAGE } from "@/features/auth/messages";
import { staffThrottleKey, type LoginThrottle } from "./login-throttle";

export type StaffSignInResult = { ok: true; staffId: string } | { ok: false; formError: string };

export type StaffSignInDeps = { staff: StaffRepository; throttle: LoginThrottle; now: number };

/**
 * Checks an email and password (Step 50.1). Refuses a locked email before
 * looking at the password, so the right password can't be found by
 * guessing past the limit. A missing account, an invited account with no
 * password yet and a wrong password all count as a failure and give the
 * same answer. scrypt runs in every case, against a decoy hash when
 * there's no real one: otherwise an unknown email would answer faster,
 * which would give away which emails have accounts.
 */
export async function checkStaffSignIn(
  input: { email: string; password: string },
  deps: StaffSignInDeps,
): Promise<StaffSignInResult> {
  const key = staffThrottleKey(input.email);
  if (deps.throttle.isLocked(key, deps.now)) return { ok: false, formError: TOO_MANY_TRIES_MESSAGE };

  const found = await deps.staff.findForSignIn(input.email);
  const matches = await passwordMatches(input.password, found?.passwordHash ?? (await decoyPasswordHash()));

  if (!found?.passwordHash || !matches) {
    const locked = deps.throttle.recordFailure(key, deps.now);
    return { ok: false, formError: locked ? TOO_MANY_TRIES_MESSAGE : WRONG_SIGN_IN_MESSAGE };
  }

  deps.throttle.recordSuccess(key);
  return { ok: true, staffId: found.staff.id };
}
