import type { ParentRepository } from "@/data/repositories";
import { TOO_MANY_TRIES_MESSAGE } from "@/features/auth/messages";
import type { LoginThrottle } from "@/services/auth/login-throttle";
import { parentSignupSchema } from "@/features/parents/auth-schemas";
import type { Parent, ParentSignupInput } from "@/features/parents/types";
import { firstFieldErrors } from "./field-errors";

export const EMAIL_TAKEN_MESSAGE = "An account with this email already exists.";

export type ParentSignupFieldErrors = Partial<Record<keyof ParentSignupInput, string>>;

export type RegisterParentResult =
  | { ok: true; parent: Parent }
  | { ok: false; code: "invalid_input" | "email_taken"; fieldErrors: ParentSignupFieldErrors }
  | { ok: false; code: "too_many_tries"; formError: string };

export type RegisterParentDeps = {
  parents: Pick<ParentRepository, "findByEmail" | "create">;
  /** Sign-ups per address (Step 53.3). */
  signUpThrottle: LoginThrottle;
  /** `clientAddressKey(...)`: null when the request isn't limited by address. */
  address: string | null;
  now: number;
};

/**
 * A new parent account (Step 22), for the web portal's sign-up and, from
 * Step 53.3, the parent app's. Checked again with the form's own schema,
 * since anything can be sent to a server. Saying an email is taken tells a
 * stranger it has an account here: accepted until sign-up confirms an
 * email by sending to it (Step 55.5). Each well-formed sign-up counts
 * against its address (100 an hour, Step 53.3), checked before the
 * password is hashed; a form with typos doesn't count.
 */
export async function registerParent(input: unknown, deps: RegisterParentDeps): Promise<RegisterParentResult> {
  const parsed = parentSignupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input", fieldErrors: firstFieldErrors(parsed.error) };

  if (deps.address) {
    const key = `parent-sign-up:${deps.address}`;
    if (deps.signUpThrottle.isLocked(key, deps.now)) {
      return { ok: false, code: "too_many_tries", formError: TOO_MANY_TRIES_MESSAGE };
    }
    if (deps.signUpThrottle.recordFailure(key, deps.now)) {
      console.warn("Parent sign-up locked for an hour: too many sign-ups from one address.");
    }
  }

  const { firstName, lastName, mobile, email, password } = parsed.data;
  const taken: RegisterParentResult = { ok: false, code: "email_taken", fieldErrors: { email: EMAIL_TAKEN_MESSAGE } };
  if (await deps.parents.findByEmail(email)) return taken;

  // Two sign-ups with one email at once both get past the check above; the
  // repository keeps one and answers null for the other.
  const parent = await deps.parents.create({ id: crypto.randomUUID(), firstName, lastName, mobile, email }, password);
  return parent ? { ok: true, parent } : taken;
}
