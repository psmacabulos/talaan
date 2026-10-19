import { createHash, randomBytes } from "node:crypto";
import type { ParentTokenRepository } from "@/data/repositories";
import { readBearerToken } from "@/services/devices/device-token";

/** Every parent token starts with this, so a leaked one is easy to recognise and search for. A gate's is `tal_dev_`. */
export const PARENT_TOKEN_PREFIX = "tal_par_";

const DAY_MS = 24 * 60 * 60_000;

/** A token stops working after this long unused (docs/PARENT-APP-BRIEF.md: "90 days from its last use"). */
export const PARENT_TOKEN_UNUSED_LIMIT_MS = 90 * DAY_MS;

/** How often a token's `lastUsedAt` is written: once an hour is plenty for a 90-day limit, and spares a write per request. */
const TOUCH_EVERY_MS = 60 * 60_000;

export type ParentTokenDeps = { tokens: ParentTokenRepository };

/** Who a request comes from: the parent, and which signed-in phone (for sign-out). */
export type ParentCaller = { parentId: string; tokenId: string };

/** sha256: enough for 32 truly random bytes, and the same input always gives the same hash, so it can be looked up. */
function hashParentToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function before(now: string, ms: number): string {
  return new Date(Date.parse(now) - ms).toISOString();
}

/**
 * Signs a phone in (Step 53.3): a new random token, returned once and kept
 * only as its hash. The parent's revoked tokens, and those unused for 90
 * days that have no push address (Step 54), are cleared first, so a parent
 * who signs in many times over the years keeps only a few rows.
 */
export async function issueParentToken(
  parentId: string,
  label: string | null,
  now: string,
  deps: ParentTokenDeps,
): Promise<string> {
  await deps.tokens.deleteStale(parentId, before(now, PARENT_TOKEN_UNUSED_LIMIT_MS));
  const token = `${PARENT_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  await deps.tokens.create({ id: crypto.randomUUID(), parentId, label }, hashParentToken(token), now);
  return token;
}

/**
 * The parent behind an `Authorization: Bearer tal_par_…` header, or null
 * for anything else: no header, a gate's token, an unknown, revoked or
 * 90-days-unused token. Using a token keeps it alive, so a parent who opens
 * the app now and then never signs in again. The token is never logged.
 */
export async function authenticateParent(
  authorization: string | null,
  now: string,
  deps: ParentTokenDeps,
): Promise<ParentCaller | null> {
  const token = readBearerToken(authorization);
  if (!token?.startsWith(PARENT_TOKEN_PREFIX)) return null;

  const stored = await deps.tokens.findByHash(hashParentToken(token));
  if (!stored || stored.revokedAt) return null;
  if (Date.parse(stored.lastUsedAt) < Date.parse(before(now, PARENT_TOKEN_UNUSED_LIMIT_MS))) return null;

  const touchBefore = before(now, TOUCH_EVERY_MS);
  if (Date.parse(stored.lastUsedAt) < Date.parse(touchBefore)) await deps.tokens.touch(stored.id, now, touchBefore);
  return { parentId: stored.parentId, tokenId: stored.id };
}
