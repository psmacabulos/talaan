import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/** A code works for 15 minutes (Step 55.6). */
export const RESET_CODE_MINUTES = 15;
/** 5 tries per code, the right one included. */
export const RESET_CODE_MAX_TRIES = 5;
/** 5 codes per parent in 24 hours, counted in Postgres, so a restart doesn't clear it. */
export const RESET_CODES_PER_DAY = 5;

/** Six random digits, from Node's secure random source; leading zeros kept. */
export function makeResetCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * What's stored instead of the code: an HMAC with the server's secret and
 * the row's id. A plain sha256 of a 6-digit code could be reversed by
 * trying all million in a second; without the secret, it can't.
 */
export function hashResetCode(id: string, code: string, secret: string): string {
  return createHmac("sha256", secret).update(`parent-reset:${id}:${code}`).digest("hex");
}

/** Compares in constant time, so the answer's timing says nothing about how close a guess was. */
export function resetCodeMatches(storedHash: string, id: string, typed: string, secret: string): boolean {
  const expected = Buffer.from(storedHash, "hex");
  const actual = Buffer.from(hashResetCode(id, typed, secret), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
