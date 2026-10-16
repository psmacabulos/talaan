import { pushTokenRepository } from "@/data/repositories";
import { readJsonBody, requireParent } from "@/features/parents/api-request";
import { API_MESSAGES, apiError } from "@/features/parents/api-responses";
import { registerPushToken } from "@/services/parents/push-tokens";

/**
 * The app registers where this phone receives pushes (Step 53.4): after
 * sign-in, whenever Expo gives it a new token, and on every start. Step 54
 * sends to it.
 */
export async function POST(request: Request) {
  const caller = await requireParent(request);
  if (caller instanceof Response) return caller;

  const read = await readJsonBody(request);
  if (!read) return apiError("invalid_input", "The request body isn't JSON.");

  const result = await registerPushToken(caller, read.body, { pushTokens: pushTokenRepository });
  if (!result.ok) {
    if (result.code === "unauthorized") return apiError("unauthorized", API_MESSAGES.unauthorized);
    return apiError("invalid_input", API_MESSAGES.invalidInput, result.fieldErrors);
  }
  return new Response(null, { status: 204 });
}
