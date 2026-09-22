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
