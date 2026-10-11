import { firstFourBytes } from "@/features/students/card-serial";
import type { Card } from "@/features/students/types";

/**
 * Which card a tap's serial means, from this school's cards that share its
 * first 4 bytes (`CardRepository.listBySerialPrefix`):
 * - the exact serial first;
 * - otherwise a card with the same first 4 bytes, so a card linked by its
 *   7-byte UID is found when the USB reader sends only 4, and the other way
 *   round. An active card beats a lost or retired one.
 * Two equally good matches give null: better "unknown card" than the wrong
 * child.
 */
export function matchCard(serial: string, candidates: Card[]): Card | null {
  const exact = candidates.find((card) => card.serial === serial);
  if (exact) return exact;

  const prefix = firstFourBytes(serial);
  const twins = candidates.filter((card) => firstFourBytes(card.serial) === prefix);
  const active = twins.filter((card) => card.status === "active");
  const best = active.length > 0 ? active : twins;
  return best.length === 1 ? best[0] : null;
}
