import { createHmac } from "node:crypto";
import type { LinkAttemptRepository } from "@/data/repositories";

/**
 * The per-child limit on "link a child" tries (Step 55.1, docs/SCALING.md
 * 1.2): with a child's LRN and last name, every birth date for a high
 * school age is about 2,500 tries. 10 tries in 24 hours for one school, LRN
 * and last name lock linking that child until a day has passed, whoever
 * sends them and from however many accounts.
 */
export const LINK_TRIES_PER_CHILD = 10;
export const LINK_TRIES_WINDOW_MS = 24 * 60 * 60_000;

/** Owner decision, 2026-10-21: no staff screen can unlock it yet, so the parent just waits. */
export const TOO_MANY_LINK_TRIES_MESSAGE = "Too many tries for this student. Try again tomorrow.";

/** How often old tries are cleared, at most: from a link try itself, so no timer is needed. */
const CLEAN_UP_EVERY_MS = 60 * 60_000;

/**
 * The key one child's tries are counted under: an HMAC of the school, LRN
 * and last name (trimmed and lowercased, the way the student lookup matches
 * it), with the server's secret. No LRN is stored, and without the secret
 * the key can't be turned back into one by trying every 12-digit LRN.
 * Locking a child out needs their LRN and last name, the same two details
 * the limit protects.
 */
export function linkAttemptKey(secret: string, schoolId: string, lrn: string, lastName: string): string {
  return createHmac("sha256", secret)
    .update(`link-attempt|${schoolId}|${lrn}|${lastName.trim().toLowerCase()}`)
    .digest("hex");
}

let lastCleanUpAt = Number.NEGATIVE_INFINITY;

/**
 * Saves this try, then counts the last 24 hours' tries for the same key,
 * this one included. Saving first means tries sent all at once each count
 * the ones saved before them, so no more than the limit get through.
 * Returns the try's id (to take it back if the details turn out right) and
 * whether the child is locked.
 */
export async function countLinkTry(
  attempts: LinkAttemptRepository,
  attempt: { schoolId: string; keyHash: string },
  now: number,
): Promise<{ id: string; locked: boolean }> {
  const at = new Date(now).toISOString();
  const id = await attempts.record({ ...attempt, at });
  const tries = await attempts.countSince(attempt.keyHash, new Date(now - LINK_TRIES_WINDOW_MS).toISOString());

  // Correct without it, since the count only looks back 24 hours; this keeps the table small.
  if (now - lastCleanUpAt >= CLEAN_UP_EVERY_MS) {
    lastCleanUpAt = now;
    await attempts.deleteOlderThan(new Date(now - LINK_TRIES_WINDOW_MS).toISOString());
  }

  const locked = tries > LINK_TRIES_PER_CHILD;
  // A refused try isn't kept: retrying during a lock mustn't keep it rolling
  // past the day the message promises (Step 55.1's code review). It can't
  // let anyone through either, since it was over the limit already.
  if (locked) await attempts.remove(id);
  return { id, locked };
}
