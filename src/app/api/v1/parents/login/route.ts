import { z } from "zod";
import { parentRepository, parentTokenRepository } from "@/data/repositories";
import { readJsonBody, requestAddress } from "@/features/parents/api-request";
import { apiError, toParentJson } from "@/features/parents/api-responses";
import { parentAddressThrottle, parentSignInThrottle } from "@/services/auth/login-throttle";
import { checkParentSignIn } from "@/services/parents/check-parent-sign-in";
import { issueParentToken } from "@/services/parents/parent-token";

const deviceLabelSchema = z.string().trim().min(1).max(100).optional();

/** Signs a phone in (Step 53.3): `checkParentSignIn`'s rules and limits, the same as the web's, then a new token. */
export async function POST(request: Request) {
  const read = await readJsonBody(request);
  if (!read || typeof read.body !== "object" || read.body === null) {
    return apiError("invalid_input", "The request body isn't JSON.");
  }
  const body = read.body as Record<string, unknown>;
  const label = deviceLabelSchema.safeParse(body.deviceLabel);

  const result = await checkParentSignIn(body, {
    parents: parentRepository,
    throttle: parentSignInThrottle,
    addressThrottle: parentAddressThrottle,
    address: requestAddress(request),
    now: Date.now(),
  });
  if (!result.ok) return apiError(result.code, result.formError);

  const token = await issueParentToken(
    result.parent.id,
    label.success ? (label.data ?? null) : null,
    new Date().toISOString(),
    { tokens: parentTokenRepository },
  );
  return Response.json({ token, parent: toParentJson(result.parent) });
}
