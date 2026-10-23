import type { StaffRepository } from "@/data/repositories";
import { RESET_EMAIL_LINK_SECONDS } from "@/features/auth/set-password-rules";
import type { EmailSender } from "@/lib/email/email-sender";
import { dailyCapReached, sendCappedEmail } from "./capped-email";
import { staffResetKey, type LoginThrottle } from "./login-throttle";
import { resetLinkEmail } from "./reset-emails";
import { makeSetPasswordToken, setPasswordUrl } from "./set-password-link";

export type StaffResetDeps = {
  staff: StaffRepository;
  sender: EmailSender;
  secret: string;
  /** `appUrl()` (src/lib/env.ts): the link's address never comes from the request. */
  appUrl: string;
  now: Date;
  emailThrottle: LoginThrottle;
  addressThrottle: LoginThrottle;
  dailyCap: LoginThrottle;
};

/**
 * `accepted` comes with `send`, for the caller to pass to `after()`: the
 * lookup and the email happen once the answer has gone, so it takes the
 * same time whether or not the email has an account.
 */
export type StartResetResult =
  | { outcome: "accepted"; send: () => Promise<void> }
  | { outcome: "too_many" }
  | { outcome: "unavailable" };

/**
 * "Forgot your password?" for staff (Step 55.5). The limits count every
 * request the same, known email or not: 3 per email and 20 per network an
 * hour, and the app's 80 emails a day. `email` is already trimmed and in
 * lower case (`emailSchema`), and `address` is `clientAddressKey`'s (null
 * on this computer, which is never limited).
 */
export function startStaffPasswordReset(
  email: string,
  address: string | null,
  deps: StaffResetDeps,
): StartResetResult {
  const now = deps.now.getTime();
  if (dailyCapReached({ dailyCap: deps.dailyCap, now })) return { outcome: "unavailable" };

  const key = staffResetKey(email);
  if (deps.emailThrottle.isLocked(key, now)) return { outcome: "too_many" };
  if (address && deps.addressThrottle.isLocked(address, now)) return { outcome: "too_many" };
  deps.emailThrottle.recordFailure(key, now);
  if (address) deps.addressThrottle.recordFailure(address, now);

  return { outcome: "accepted", send: () => sendResetLink(email, deps) };
}

/**
 * Emails a 1-hour set-password link, only to an account that already has
 * a password. An unknown email gets nothing, and so does an invited
 * account: its email was typed by the principal and never checked, and
 * invitations stay a link the principal sends (Step 55.5's decision 8).
 */
async function sendResetLink(email: string, deps: StaffResetDeps): Promise<void> {
  try {
    const found = await deps.staff.findForSignIn(email);
    if (!found?.passwordHash) return;

    const token = makeSetPasswordToken(
      found.staff.id,
      found.passwordHash,
      deps.secret,
      deps.now,
      RESET_EMAIL_LINK_SECONDS,
    );
    const message = resetLinkEmail(found.staff, setPasswordUrl(token, deps.appUrl));
    await sendCappedEmail(message, "reset email", {
      sender: deps.sender,
      dailyCap: deps.dailyCap,
      now: deps.now.getTime(),
    });
  } catch {
    console.error("email: reset email failed: lookup");
  }
}
