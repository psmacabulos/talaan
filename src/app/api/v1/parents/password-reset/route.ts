import { after } from "next/server";
import { parentPasswordResetRepository, parentRepository } from "@/data/repositories";
import { PARENT_EMAIL_UNAVAILABLE_MESSAGE, RESET_TOO_MANY_MESSAGE } from "@/features/auth/messages";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import { readJsonBody, requestAddress } from "@/features/parents/api-request";
import { API_MESSAGES, apiError } from "@/features/parents/api-responses";
import { canEmailPeople, emailSender } from "@/lib/email/email-sender";
import { sessionSecret } from "@/lib/env";
import { dailyEmailCap, parentResetEmailThrottle, resetAddressThrottle } from "@/services/auth/login-throttle";
import { startParentPasswordReset } from "@/services/parents/parent-password-reset";

/**
 * "Forgot your password?" from the app (Step 55.6): `202 {}` for any email
 * that passes the limits, known or not; the code is emailed once the
 * answer has gone (`after()`). `503 unavailable` when no email can go.
 */
export async function POST(request: Request) {
  const read = await readJsonBody(request);
  if (!read) return apiError("invalid_input", "The request body isn't JSON.");
  const parsed = forgotPasswordSchema.safeParse(read.body);
  if (!parsed.success) {
    return apiError("invalid_input", API_MESSAGES.invalidInput, { email: "Enter a valid email address" });
  }

  const result = startParentPasswordReset(parsed.data.email, requestAddress(request), {
    parents: parentRepository,
    resets: parentPasswordResetRepository,
    sender: emailSender(),
    secret: sessionSecret(),
    canEmail: canEmailPeople(),
    // The real clock, never DEMO_NOW: a code's 15 minutes are real minutes.
    now: new Date(),
    emailThrottle: parentResetEmailThrottle,
    addressThrottle: resetAddressThrottle,
    dailyCap: dailyEmailCap,
  });
  switch (result.outcome) {
    case "accepted":
      after(result.send);
      return Response.json({}, { status: 202 });
    case "too_many":
      return apiError("too_many_tries", RESET_TOO_MANY_MESSAGE);
    case "unavailable":
      return apiError("unavailable", PARENT_EMAIL_UNAVAILABLE_MESSAGE);
  }
}
