import type { Card } from "@/features/students/types";
import { seedStudents } from "./students";

function toHexByte(n: number): string {
  return n.toString(16).toUpperCase().padStart(2, "0");
}

/** A deterministic, plausible-looking 7-byte NFC UID for a given index.
 * Exported so src/data/seed/taps.ts can tap the exact same serials these
 * cards were issued. */
export function cardSerialAt(index: number): string {
  const bytes = [0x04, ...Array.from({ length: 6 }, (_, i) => (index * 37 + i * 91 + 17) % 256)];
  return bytes.map(toHexByte).join(":");
}

const NO_CARD_YET_EVERY = 9; // a card hasn't been issued to every student yet

export const seedCards: Card[] = seedStudents.flatMap((student, index) => {
  // One deliberate example of a full replace history: an old lost card plus
  // the active replacement, to give Step 16's card-replace flow (and the
  // sample lost-card alert in taps.ts) something real to point at.
  if (index === 0) {
    return [
      {
        id: `card-${student.id}-lost`,
        schoolId: student.schoolId,
        studentId: student.id,
        serial: cardSerialAt(index),
        status: "lost",
        linkedAt: "2026-06-01T08:00:00Z",
      },
      {
        id: `card-${student.id}-active`,
        schoolId: student.schoolId,
        studentId: student.id,
        serial: cardSerialAt(index + 1000),
        status: "active",
        linkedAt: "2026-06-15T08:00:00Z",
      },
    ] satisfies Card[];
  }

  if (index % NO_CARD_YET_EVERY === 0) {
    return [];
  }

  return [
    {
      id: `card-${student.id}-active`,
      schoolId: student.schoolId,
      studentId: student.id,
      serial: cardSerialAt(index),
      status: "active",
      linkedAt: "2026-06-01T08:00:00Z",
    },
  ] satisfies Card[];
});
