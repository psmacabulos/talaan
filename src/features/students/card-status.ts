import type { Card } from "./types";

/**
 * A student's card situation, collapsed to one of three states for
 * filtering and display. A student's full card history (src/data/seed/cards.ts
 * gives some students a lost-then-replaced history) can hold several rows;
 * this always resolves to what matters right now.
 */
export type CardFilterStatus = "active" | "lost" | "none";

/**
 * Active wins over everything (CLAUDE.md: one active card per student, and a
 * replacement marks the old one lost — so an active card means the lost one,
 * if any, is already resolved). Otherwise, a lost card on file is worth
 * surfacing as an alert rather than just "no card". Retired cards with no
 * active replacement are treated the same as never having had one.
 */
export function deriveCardStatus(cards: Card[]): CardFilterStatus {
  if (cards.some((card) => card.status === "active")) {
    return "active";
  }
  if (cards.some((card) => card.status === "lost")) {
    return "lost";
  }
  return "none";
}
