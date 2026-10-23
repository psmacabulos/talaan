import { after } from "next/server";
import { z } from "zod";
import { parentPasswordResetRepository, parentRepository, parentTokenRepository } from "@/data/repositories";
import { readJsonBody, requestAddress } from "@/features/parents/api-request";
import { API_MESSAGES, apiError, toParentJson } from "@/features/parents/api-responses";
import { emailSender } from "@/lib/email/email-sender";
import { sessionSecret } from "@/lib/env";
import { dailyEmailCap, parentAddressThrottle, parentSignInThrottle } from "@/services/auth/login-throttle";
import { confirmParentPasswordReset } from "@/services/parents/parent-password-reset";
import { issueParentToken } from "@/services/parents/parent-token";

const deviceLabelSchema = z.string().trim().min(1).max(100).optional();

/**
 * A new password with the emailed code (Step 55.6). Every phone and browser
 * signed in before is signed out; this phone gets a new token, the same
 * answer as login. The app then registers its push address again.
 */
export async function POST(request: Request) {
  const read = await readJsonBody(request);
  if (!read || typeof read.body !== "object" || read.body === null) {
    return apiError("invalid_input", "The request body isn't JSON.");
  }
  const body = read.body as Record<string, unknown>;
  const label = deviceLabelSchema.safeParse(body.deviceLabel);
  if (!label.success) {
    return apiError("invalid_input", API_MESSAGES.invalidInput, { deviceLabel: "Use 100 characters or fewer" });
  }

  const result = await confirmParentPasswordReset(body, {
    parents: parentRepository,
    resets: parentPasswordResetRepository,
    sender: emailSender(),
    dailyCap: dailyEmailCap,
    secret: sessionSecret(),
    signInThrottle: parentSignInThrottle,
    addressThrottle: parentAddressThrottle,
    address: requestAddress(request),
    now: new Date(),
  });
  if (!result.ok) {
    return result.code === "invalid_input"
      ? apiError("invalid_input", API_MESSAGES.invalidInput, result.fieldErrors)
      : apiError(result.code, result.formError);
  }

  after(result.notify);
  const token = await issueParentToken(result.parent.id, label.data ?? null, new Date().toISOString(), {
    tokens: parentTokenRepository,
  });
  return Response.json({ token, parent: toParentJson(result.parent) });
}
