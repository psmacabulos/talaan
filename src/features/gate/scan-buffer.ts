/** A USB reader types a whole card in a few milliseconds; a person can't type two keys this close together. */
export const MAX_KEY_GAP_MS = 100;
/** Shorter than any card a reader sends (4 bytes is 8 hex characters, or the reader's 10 digits). */
const MIN_SCAN_LENGTH = 8;

/**
 * Turns key presses into card scans, with no input field on screen (an
 * input would pop up Android's on-screen keyboard over the gate). Enter
 * ends a scan. A gap longer than MAX_KEY_GAP_MS starts over, so stray
 * human typing never merges into a card or becomes one.
 */
export function createScanBuffer(onScan: (raw: string) => void) {
  let buffer = "";
  let lastKeyAt = Number.NEGATIVE_INFINITY;

  return {
    key(key: string, at: number) {
      if (key === "Enter") {
        if (buffer.length >= MIN_SCAN_LENGTH) onScan(buffer);
        buffer = "";
        return;
      }
      // Shift, Tab and the like: not part of a card.
      if (key.length !== 1) return;
      if (at - lastKeyAt > MAX_KEY_GAP_MS) buffer = "";
      buffer += key;
      lastKeyAt = at;
    },
  };
}
