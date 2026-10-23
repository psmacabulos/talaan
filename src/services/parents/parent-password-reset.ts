import { z } from "zod";
import type { ParentPasswordResetRepository, ParentRepository } from "@/data/repositories";
import { emailSchema, passwordSchema } from "@/features/auth/schemas";
import { RESET_CODE_INVALID_MESSAGE, TOO_MANY_TRIES_MESSAGE } from "@/features/auth/messages";
import { resetCodeSchema } from "@/features/parents/auth-schemas";
import type { Parent } from "@/features/parents/types";
import type { EmailSender } from "@/lib/email/email-sender";
import { hashPassword } from "@/lib/password";
import { dailyCapReached, sendCappedEmail } from "@/services/auth/capped-email";
import {
  parentAddressKey,
  parentResetKey,
  parentThrottleKey,
  type LoginThrottle,
} from "@/services/auth/login-throttle";
import { parentResetCodeEmail, passwordChangedEmail } from "@/services/auth/reset-emails";
import type { StartResetResult } from "@/services/auth/staff-password-reset";
import { firstFieldErrors } from "./field-errors";
import {
  hashResetCode,
  makeResetCode,
  RESET_CODE_MAX_TRIES,
  RESET_CODE_MINUTES,
  RESET_CODES_PER_DAY,
  resetCodeMatches,
} from "./reset-code";

const DAY_MS = 24 * 60 * 60_000;

type EmailDeps = { sender: EmailSender; dailyCap: LoginThrottle };

export type ParentResetDeps = EmailDeps & {
  parents: Pick<ParentRepository, "findByEmail">;
  resets: ParentPasswordResetRepository;
  secret: string;
  /** `canEmailPeople()`: false on a live server still on "log", which would report "sent" and send nothing. */
  canEmail: boolean;
  now: Date;
  emailThrottle: LoginThrottle;
  addressThrottle: LoginThrottle;
};

/**
 * A parent's "Forgot your password?" (Step 55.6), from the app or the web
 * portal. The same shape as staff's (Step 55.5): the limits are counted
 * here, the same for every email, and `send` (for `after()`) looks the
 * parent up and emails the code once the answer has gone. `email` is
 * already trimmed and in lower case (`emailSchema`); `address` is
 * `clientAddressKey`'s, null on this computer.
 */
export function startParentPasswordReset(
  email: string,
  address: string | null,
  deps: ParentResetDeps,
): StartResetResult {
  const now = deps.now.getTime();
  if (!deps.canEmail || dailyCapReached({ dailyCap: deps.dailyCap, now })) return { outcome: "unavailable" };

  const key = parentResetKey(email);
  if (deps.emailThrottle.isLocked(key, now)) return { outcome: "too_many" };
  if (address && deps.addressThrottle.isLocked(address, now)) return { outcome: "too_many" };
  deps.emailThrottle.recordFailure(key, now);
  if (address) deps.addressThrottle.recordFailure(address, now);

  return { outcome: "accepted", send: () => sendResetCode(email, deps) };
}

/**
 * Emails a new 6-digit code, at most 5 a day per parent (counted in
 * Postgres, so a restart doesn't clear it). An unknown email gets nothing.
 * Never throws, and never logs an address or a code.
 */
async function sendResetCode(email: string, deps: ParentResetDeps): Promise<void> {
  try {
    const parent = await deps.parents.findByEmail(email);
    if (!parent) return;

    const now = deps.now.getTime();
    const sent = await deps.resets.countRecent(parent.id, new Date(now - DAY_MS).toISOString());
    if (sent >= RESET_CODES_PER_DAY) {
      console.warn(`email: parent reset code not sent, ${RESET_CODES_PER_DAY} codes for this parent today`);
      return;
    }

    // Checked again here (architect): a code stored but never sent would use up one of the day's 5.
    if (dailyCapReached({ dailyCap: deps.dailyCap, now })) {
      console.warn("email: parent reset code not sent, the daily limit is reached");
      return;
    }

    const id = crypto.randomUUID();
    const code = makeResetCode();
    await deps.resets.create(
      {
        id,
        parentId: parent.id,
        codeHash: hashResetCode(id, code, deps.secret),
        expiresAt: new Date(now + RESET_CODE_MINUTES * 60_000).toISOString(),
      },
      deps.now.toISOString(),
    );
    await sendCappedEmail(parentResetCodeEmail(parent, code, RESET_CODE_MINUTES), "parent reset code", {
      sender: deps.sender,
      dailyCap: deps.dailyCap,
      now,
    });
  } catch {
    console.error("email: parent reset code failed: lookup");
  }
}

/** The code and the new password, sent together. The web form adds its own "confirm password". */
export const confirmParentResetSchema = z.object({
  email: emailSchema,
  code: resetCodeSchema,
  password: passwordSchema,
});

export type ConfirmParentResetFieldErrors = Partial<Record<keyof z.infer<typeof confirmParentResetSchema>, string>>;

export type ConfirmParentResetResult =
  | { ok: true; parent: Parent; notify: () => Promise<void> }
  | { ok: false; code: "invalid_input"; fieldErrors: ConfirmParentResetFieldErrors }
  | { ok: false; code: "invalid_code" | "too_many_tries"; formError: string };

export type ConfirmParentResetDeps = EmailDeps & {
  parents: Pick<ParentRepository, "findByEmail">;
  resets: ParentPasswordResetRepository;
  secret: string;
  /** Cleared for this email on success, so a parent locked out by wrong passwords signs in at once. */
  signInThrottle: LoginThrottle;
  /** `parentAddressThrottle`: wrong codes count with wrong passwords, per network. */
  addressThrottle: LoginThrottle;
  address: string | null;
  now: Date;
};

/**
 * Sets a new password with an emailed code (Step 55.6). Every failure gets
 * the same answer: a wrong, expired, used-up or replaced code, and an email
 * with no account. A try is spent in the database before the code is
 * compared, so at most 5 checks per code even when guesses arrive at once.
 * On success the code is used, the password stored and every phone signed
 * out, in one transaction; the caller signs this phone or browser in, and
 * passes `notify` ("Your password was changed") to `after()`.
 */
export async function confirmParentPasswordReset(
  input: unknown,
  deps: ConfirmParentResetDeps,
): Promise<ConfirmParentResetResult> {
  const parsed = confirmParentResetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input", fieldErrors: firstFieldErrors(parsed.error) };

  const { email, code, password } = parsed.data;
  const now = deps.now.getTime();
  const addressKey = deps.address ? parentAddressKey(deps.address) : null;
  if (addressKey && deps.addressThrottle.isLocked(addressKey, now)) {
    return { ok: false, code: "too_many_tries", formError: TOO_MANY_TRIES_MESSAGE };
  }

  const invalid = (): ConfirmParentResetResult => {
    if (addressKey && deps.addressThrottle.recordFailure(addressKey, now)) {
      console.warn("Parent sign-in locked for 15 minutes: too many wrong reset codes from one address.");
    }
    return { ok: false, code: "invalid_code", formError: RESET_CODE_INVALID_MESSAGE };
  };

  const parent = await deps.parents.findByEmail(email);
  if (!parent) return invalid();
  const reset = await deps.resets.newest(parent.id, new Date(now - DAY_MS).toISOString());
  if (!reset) return invalid();
  if (!(await deps.resets.spendTry(reset.id, deps.now.toISOString(), RESET_CODE_MAX_TRIES))) return invalid();
  if (!resetCodeMatches(reset.codeHash, reset.id, code, deps.secret)) return invalid();

  // scrypt is slow on purpose, so it runs before the transaction, not inside it.
  const passwordHash = await hashPassword(password);
  if (!(await deps.resets.complete(reset.id, parent.id, passwordHash, deps.now.toISOString()))) return invalid();

  deps.signInThrottle.recordSuccess(parentThrottleKey(email));
  const notify = () =>
    sendCappedEmail(passwordChangedEmail(parent), "password changed email", {
      sender: deps.sender,
      dailyCap: deps.dailyCap,
      now: Date.now(),
    });
  return { ok: true, parent, notify };
}
