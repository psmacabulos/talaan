import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

/**
 * Turns a password into something safe to store: `scrypt:<salt>:<hash>`.
 * scrypt is deliberately slow (tens of milliseconds) so someone holding a
 * copy of the database can't try billions of guesses. The random salt
 * means two parents with the same password still get different hashes.
 * Built into Node, so no extra dependency.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt.toString("base64")}:${hash.toString("base64")}`;
}

/** True when `password` is the one `stored` was made from. */
export async function passwordMatches(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, hash] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = (await scryptAsync(password, Buffer.from(salt, "base64"), expected.length)) as Buffer;
  return timingSafeEqual(actual, expected);
}
