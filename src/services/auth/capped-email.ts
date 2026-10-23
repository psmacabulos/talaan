import type { EmailMessage, EmailSender } from "@/lib/email/email-sender";
import { DAILY_EMAIL_KEY, type LoginThrottle } from "./login-throttle";

export type CappedEmailDeps = { sender: EmailSender; dailyCap: LoginThrottle; now: number };

/** True once the app's daily email limit is reached (Step 55.5), so a form can say so before it promises an email. */
export function dailyCapReached(deps: Pick<CappedEmailDeps, "dailyCap" | "now">): boolean {
  return deps.dailyCap.isLocked(DAILY_EMAIL_KEY, deps.now);
}

/**
 * Sends one email within the app's daily limit (`dailyEmailCap`), and
 * never throws: it runs inside `after()`, once the answer has gone. A
 * failure is logged with `what` and the provider's code, never the address.
 * Every email the app sends goes through here, so the limit counts them all.
 */
export async function sendCappedEmail(message: EmailMessage, what: string, deps: CappedEmailDeps): Promise<void> {
  if (dailyCapReached(deps)) {
    console.warn(`email: ${what} not sent, the daily limit is reached`);
    return;
  }
  if (deps.dailyCap.recordFailure(DAILY_EMAIL_KEY, deps.now)) {
    console.warn("email: the daily limit is now reached; no more emails until it clears");
  }
  try {
    const result = await deps.sender.send(message);
    if (!result.ok) console.error(`email: ${what} failed: ${result.error}`);
  } catch {
    console.error(`email: ${what} failed: unknown`);
  }
}
