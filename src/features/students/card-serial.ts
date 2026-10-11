import type { Card } from "./types";

function toHexByte(n: number): string {
  return n.toString(16).toUpperCase().padStart(2, "0");
}

/**
 * A random, plausible-looking 7-byte NFC UID for the "Simulate a card tap"
 * button (Step 16) — same shape as `cardSerialAt()` in
 * `src/data/seed/cards.ts`, but genuinely randomized rather than
 * deterministic, since this stands in for a real station reading a real
 * card's actual UID.
 */
export function generateCardSerial(): string {
  const bytes = [0x04, ...Array.from({ length: 6 }, () => Math.floor(Math.random() * 256))];
  return bytes.map(toHexByte).join(":");
}

/**
 * "Reject duplicate serials" (CLAUDE.md/Step 16): a serial already carried
 * by an *active* card — on any student, not just this one — can't be
 * linked again. A lost or retired card's old serial is free to reuse in
 * this model (a real physical card's UID doesn't usually get reissued to a
 * different card, but nothing in the domain rules forbids it once the old
 * card is no longer active).
 */
export function isSerialAvailable(serial: string, existingCards: Card[]): boolean {
  return !existingCards.some((card) => card.serial === serial && card.status === "active");
}

const READER_DIGITS = /^\d{10}$/;
// 4 or 7 bytes once separators are gone: the two UID sizes the owner's
// reader and phone apps produce (owner decision, 2026-10-09).
const HEX_SERIAL = /^(?:[0-9A-F]{8}|[0-9A-F]{14})$/;
const LARGEST_FOUR_BYTES = 0xffffffff;

/**
 * The serial the app stores, from whatever a reader or a person typed
 * (docs/ARCHITECTURE.md, open question 1):
 * - the USB reader's 10 decimal digits ("0211299923") are the first 4 UID
 *   bytes, lowest byte first, so they're turned back into reading order:
 *   "53:2E:98:0C";
 * - hex, 4 or 7 bytes, with or without colons, spaces or dashes, in any
 *   case: "532e980c", "53:2E:98:0C:14:00:01".
 * Anything else is null: not a card serial.
 */
export function normalizeCardSerial(raw: string): string | null {
  const trimmed = raw.trim();

  if (READER_DIGITS.test(trimmed)) {
    const value = Number(trimmed);
    if (value > LARGEST_FOUR_BYTES) return null;
    const bytes = [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
    return bytes.map(toHexByte).join(":");
  }

  const hex = trimmed.replace(/[\s:-]/g, "").toUpperCase();
  if (!HEX_SERIAL.test(hex)) return null;
  return hex.match(/../g)!.join(":");
}

/** "53:2E:98:0C:14:00:01" → "53:2E:98:0C": all this USB reader ever sends of a card. */
export function firstFourBytes(serial: string): string {
  return serial.split(":").slice(0, 4).join(":");
}

export type SerialConflict = "linked" | "used_before" | "same_first_bytes";

/**
 * Why a real card can't be linked, or null if it can (Step 44.7):
 * - "linked": an active card already has this exact serial;
 * - "used_before": a lost or retired card had it. Each physical card is one
 *   row forever (Card.serial is unique), so it isn't linked a second time;
 * - "same_first_bytes": another active card at the school starts with the
 *   same 4 bytes. This reader sends only those 4, so the gate couldn't tell
 *   the two cards apart.
 */
export function findSerialConflict(
  serial: string,
  sameSerial: Card | null,
  sameFirstBytes: Card[],
): SerialConflict | null {
  if (sameSerial) return sameSerial.status === "active" ? "linked" : "used_before";
  const twin = sameFirstBytes.find((card) => card.serial !== serial && card.status === "active");
  return twin ? "same_first_bytes" : null;
}
