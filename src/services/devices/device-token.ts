import { createHash, randomBytes } from "node:crypto";

/**
 * A new device token: `tal_dev_` plus 32 random bytes. The prefix makes a
 * leaked token easy to recognise (in a log, a screenshot, a chat) and to
 * search for.
 */
export function generateDeviceToken(): string {
  return `tal_dev_${randomBytes(32).toString("base64url")}`;
}

/**
 * What the database stores and looks up. sha256 is enough here, unlike a
 * password: the token is 32 truly random bytes, so there's nothing to
 * guess, and the lookup needs the same input to give the same hash every
 * time (no salt).
 */
export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** The token from an `Authorization: Bearer <token>` header, or null. */
export function readBearerToken(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}
