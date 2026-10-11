import { firstFourBytes, normalizeCardSerial } from "@/features/students/card-serial";
import type { GateRoster } from "./roster";

export type RosterStudent = GateRoster["students"][number];

/**
 * Who a scan probably is, from the gate's own copy of the roster, so the
 * photo and name show the moment a card is read (Step 47). The same rule as
 * the server's `matchCard`: the exact serial, else the first 4 bytes, and
 * never a guess between two. The server still decides what the tap means.
 */
export function findRosterStudent(raw: string, roster: GateRoster | null): RosterStudent | null {
  const serial = normalizeCardSerial(raw);
  if (!serial || !roster) return null;

  const exact = roster.cards.find((card) => card.serial === serial);
  const twins = roster.cards.filter((card) => firstFourBytes(card.serial) === firstFourBytes(serial));
  const card = exact ?? (twins.length === 1 ? twins[0] : undefined);
  return card ? (roster.students.find((student) => student.id === card.studentId) ?? null) : null;
}
