/** The same card read again this soon after its last read is the reader repeating itself, not a new tap (Step 56). */
export const REPEAT_WINDOW_MS = 5_000;

/**
 * Drops a card read that repeats the one before it within `windowMs`,
 * before it's sent. Measured from the *last* read, so a card held on a
 * reader that reads it every second is sent once, however long it stays.
 * A different card in between makes the next read of the first one new.
 * Only saves requests: the server's 2-minute rule is the real guard. A
 * read that couldn't be sent is saved on the tablet (Step 58), so it
 * counts as handled too: holding the card on the reader saves it once.
 */
export function createRepeatFilter(windowMs = REPEAT_WINDOW_MS) {
  let last: { raw: string; at: number } | null = null;

  return {
    /** True when this read repeats the last one. Every read, repeat or not, becomes the last one. */
    isRepeat(raw: string, at: number): boolean {
      const repeat = last !== null && last.raw === raw && at - last.at < windowMs;
      last = { raw, at };
      return repeat;
    },
  };
}
