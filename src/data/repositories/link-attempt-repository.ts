/**
 * "Link a child" tries, so a child's details can't be guessed one birth date
 * at a time (Step 55.1). Only Postgres keeps them: an in-memory count would
 * be wiped by every restart, and Heroku restarts the server daily.
 */
export interface LinkAttemptRepository {
  /** Saves one try for this key and gives back its id. Saved before it's counted, so tries sent all at once each see the others. */
  record(attempt: { schoolId: string; keyHash: string; at: string }): Promise<string>;
  /** How many tries this key has had since `since`, this one included. */
  countSince(keyHash: string, since: string): Promise<number>;
  /** Takes back one try: a right answer isn't a guess. */
  remove(id: string): Promise<void>;
  /** Deletes every try older than `before`, and says how many. */
  deleteOlderThan(before: string): Promise<number>;
}
