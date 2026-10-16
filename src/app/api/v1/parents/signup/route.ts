import { z } from "zod";
import { parentRepository, parentTokenRepository } from "@/data/repositories";
import { readJsonBody, requestAddress } from "@/features/parents/api-request";
import { API_MESSAGES, apiError, toParentJson } from "@/features/parents/api-responses";
import { parentSignUpThrottle } from "@/services/auth/login-throttle";
import { issueParentToken } from "@/services/parents/parent-token";
import { registerParent } from "@/services/parents/register-parent";

/** What the app calls this phone, e.g. "Pixel 7": optional, so a parent can tell sessions apart later. */
const deviceLabelSchema = z.string().trim().min(1).max(100).optional();

/**
 * A new parent account from the app, answered with its first token (Step
 * 53.3). The rules are `registerParent`'s, the same as the web sign-up's.
 * Not one transaction with the token: if issuing it fails, the account
 * stays, and the app's retry gets 409 and signs in instead.
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

  // The app has no "confirm password" field: that check belongs to the web form.
  const result = await registerParent(
    { ...body, confirmPassword: body.password },
    {
      parents: parentRepository,
      signUpThrottle: parentSignUpThrottle,
      address: requestAddress(request),
      now: Date.now(),
    },
  );
  if (!result.ok) {
    if (result.code === "too_many_tries") return apiError("too_many_tries", result.formError);
    if (result.code === "email_taken") return apiError("conflict", result.fieldErrors.email ?? "", result.fieldErrors);
    // The app has no such field, so its message (a missing password) never goes back.
    const fields = { ...result.fieldErrors };
    delete fields.confirmPassword;
    return apiError("invalid_input", API_MESSAGES.invalidInput, fields);
  }

  const token = await issueParentToken(result.parent.id, label.data ?? null, new Date().toISOString(), {
    tokens: parentTokenRepository,
  });
  return Response.json({ token, parent: toParentJson(result.parent) }, { status: 201 });
}
