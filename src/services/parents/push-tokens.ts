import { z } from "zod";
import type { ParentTokenRepository, PushTokenRepository } from "@/data/repositories";
import type { ParentCaller } from "./parent-token";
import { firstFieldErrors } from "./field-errors";

/** What `getExpoPushTokenAsync` gives the app: `ExponentPushToken[…]` (older SDKs) or `ExpoPushToken[…]`. */
const EXPO_PUSH_TOKEN = /^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]+\]$/;

const NOT_A_PUSH_TOKEN = "Send the phone's Expo push token";

export const pushTokenSchema = z.object({
  token: z.string({ error: NOT_A_PUSH_TOKEN }).max(200, NOT_A_PUSH_TOKEN).regex(EXPO_PUSH_TOKEN, NOT_A_PUSH_TOKEN),
  platform: z.enum(["ios", "android"], { error: "Use ios or android" }),
});

export type PushTokenFieldErrors = Partial<Record<keyof z.infer<typeof pushTokenSchema>, string>>;

export type RegisterPushTokenResult =
  | { ok: true }
  | { ok: false; code: "invalid_input"; fieldErrors: PushTokenFieldErrors }
  | { ok: false; code: "unauthorized" };

export type PushTokenDeps = { pushTokens: PushTokenRepository };

/**
 * Saves where this signed-in phone receives pushes (Step 53.4), for Step 54
 * to send to. One address per sign-in, and one row per address: a phone
 * that signs in as another parent moves its address to that sign-in. The
 * app registers on every start, so an unchanged address is one read and no
 * write. The token is never logged.
 */
export async function registerPushToken(
  caller: ParentCaller,
  input: unknown,
  deps: PushTokenDeps,
): Promise<RegisterPushTokenResult> {
  const parsed = pushTokenSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input", fieldErrors: firstFieldErrors(parsed.error) };
  const { token, platform } = parsed.data;

  const stored = await deps.pushTokens.findByToken(token);
  if (stored?.parentTokenId === caller.tokenId && stored.platform === platform) return { ok: true };

  const row = { id: crypto.randomUUID(), token, platform, parentTokenId: caller.tokenId };
  // Two registrations from one phone at once: one write wins and the other
  // clashes. Once more settles it. A second clash means yet another
  // registration from this phone has just saved, and the app registers
  // again at its next start anyway.
  let outcome = await deps.pushTokens.replace(row);
  if (outcome === "clash") outcome = await deps.pushTokens.replace({ ...row, id: crypto.randomUUID() });
  // The phone signed out (or its sign-in was cleared) while this was on its way.
  if (outcome === "signed_out") return { ok: false, code: "unauthorized" };
  return { ok: true };
}

/**
 * Signs one phone out (Step 53.4): its push address goes first, then its
 * token stops working. Revoking keeps the token's row, so the cascade that
 * would remove the address doesn't run; it's removed here instead.
 */
export async function signOutParentPhone(
  tokenId: string,
  now: string,
  deps: PushTokenDeps & { tokens: Pick<ParentTokenRepository, "revoke"> },
): Promise<void> {
  await deps.pushTokens.deleteForParentToken(tokenId);
  await deps.tokens.revoke(tokenId, now);
}
