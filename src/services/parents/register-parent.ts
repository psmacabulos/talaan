import type { ParentRepository } from "@/data/repositories";
import { parentSignupSchema } from "@/features/parents/auth-schemas";
import type { Parent, ParentSignupInput } from "@/features/parents/types";
import { firstFieldErrors } from "./field-errors";

export const EMAIL_TAKEN_MESSAGE = "An account with this email already exists.";

export type ParentSignupFieldErrors = Partial<Record<keyof ParentSignupInput, string>>;

/** Why a sign-up was refused, so the parent app's API (Step 53.3) can answer 400 or 409. */
export type RegisterParentFailure = "invalid_input" | "email_taken";

export type RegisterParentResult =
  { ok: true; parent: Parent } | { ok: false; code: RegisterParentFailure; fieldErrors: ParentSignupFieldErrors };

export type RegisterParentDeps = { parents: Pick<ParentRepository, "findByEmail" | "create"> };

/**
 * A new parent account (Step 22), for the web portal's sign-up and, from
 * Step 53.3, the parent app's. Checked again with the form's own schema,
 * since anything can be sent to a server. Saying an email is taken tells a
 * stranger it has an account here: accepted until sign-up confirms an
 * email by sending to it (Step 55.5).
 */
export async function registerParent(input: unknown, deps: RegisterParentDeps): Promise<RegisterParentResult> {
  const parsed = parentSignupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input", fieldErrors: firstFieldErrors(parsed.error) };

  const { firstName, lastName, mobile, email, password } = parsed.data;
  const taken: RegisterParentResult = { ok: false, code: "email_taken", fieldErrors: { email: EMAIL_TAKEN_MESSAGE } };
  if (await deps.parents.findByEmail(email)) return taken;

  // Two sign-ups with one email at once both get past the check above; the
  // repository keeps one and answers null for the other.
  const parent = await deps.parents.create({ id: crypto.randomUUID(), firstName, lastName, mobile, email }, password);
  return parent ? { ok: true, parent } : taken;
}
