import { parentTokenRepository } from "@/data/repositories";
import { clientAddressKey } from "@/lib/client-address";
import { authenticateParent, type ParentCaller } from "@/services/parents/parent-token";
import { API_MESSAGES, apiError } from "./api-responses";

/** What every parent API route reads from a request (Step 53.3). */

/** The JSON body, or null when it isn't JSON at all. */
export async function readJsonBody(request: Request): Promise<{ body: unknown } | null> {
  try {
    return { body: await request.json() };
  } catch {
    return null;
  }
}

/** Who the sign-in limits count this request against (`clientAddressKey`). */
export function requestAddress(request: Request): string | null {
  return clientAddressKey(request.headers.get("x-forwarded-for"));
}

/** The signed-in parent, or the `401` to answer with. */
export async function requireParent(request: Request): Promise<ParentCaller | Response> {
  // The real clock, never DEMO_NOW: a token's 90 days are real days.
  const caller = await authenticateParent(request.headers.get("authorization"), new Date().toISOString(), {
    tokens: parentTokenRepository,
  });
  return caller ?? apiError("unauthorized", API_MESSAGES.unauthorized);
}
