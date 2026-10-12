import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * What a signed value is for. The purpose is mixed into the stamp, so a
 * value made for one job never verifies as another: a staff session cookie
 * pasted where a parent cookie or a set-password link is expected fails.
 */
export type SignPurpose = "staff-session" | "parent-session" | "set-password";

/** Every signed value expires: `exp` is seconds since 1970, like a JWT's. */
export type SignedPayload = { exp: number } & Record<string, unknown>;

function stampOf(body: string, purpose: SignPurpose, secret: string): string {
  return createHmac("sha256", secret).update(`${purpose}.${body}`).digest("base64url");
}

/**
 * `<payload>.<stamp>`: the payload is base64url JSON, readable by anyone
 * holding the value (so never put a secret in it), and the stamp is an
 * HMAC-SHA256 of it that only the holder of `secret` can make.
 */
export function signValue(payload: SignedPayload, purpose: SignPurpose, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${stampOf(body, purpose, secret)}`;
}

/**
 * The payload, or null when the stamp doesn't match (the value was changed,
 * made for another purpose, or made with another secret), the payload
 * isn't JSON with a numeric `exp`, or `exp` has passed. Never throws, so a
 * garbage cookie is just "signed out". The caller checks the payload's
 * own fields.
 */
export function readSignedValue(
  raw: string | undefined,
  purpose: SignPurpose,
  secret: string,
  now: Date,
): Record<string, unknown> | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);

  // Compares the stamp's text, not its decoded bytes: two base64url
  // spellings can decode to the same bytes, and only the one we made counts.
  // timingSafeEqual takes as long whatever the difference, so response
  // times give nothing away about how close a guess was.
  const given = Buffer.from(raw.slice(dot + 1));
  const expected = Buffer.from(stampOf(body, purpose, secret));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  const { exp } = payload as { exp?: unknown };
  if (typeof exp !== "number" || exp * 1000 <= now.getTime()) return null;
  return payload as Record<string, unknown>;
}
