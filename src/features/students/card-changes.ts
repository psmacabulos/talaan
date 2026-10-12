import { cardRepository, type CardRepository } from "@/data/repositories";
import {
  findSerialConflict,
  firstFourBytes,
  generateCardSerial,
  isSerialAvailable,
  normalizeCardSerial,
  type SerialConflict,
} from "./card-serial";
import type { PendingCard } from "./student-changes";

/**
 * The card rules behind the student form's Save (and the drawer's
 * read-only card check). Plain server code, not Server Functions: only
 * `actions.ts` and `card-actions.ts` call it, after their own permission
 * checks. Takes its repository as an argument, so the tests run without a
 * database.
 */
type Deps = {
  cards: Pick<CardRepository, "getActiveForStudent" | "getBySerial" | "listBySerialPrefix" | "create" | "markLost">;
};

const defaultDeps: Deps = { cards: cardRepository };

export const NOT_A_SERIAL =
  "That isn't a card serial. Tap the card on the reader, or type its serial, like 53:2E:98:0C.";

const CONFLICT_MESSAGE: Record<SerialConflict, string> = {
  linked: "This card is already linked to another student.",
  used_before: "This card was reported lost or retired, so it can't be linked again. Use a different card.",
  same_first_bytes:
    "Another student's card starts with the same 4 bytes, and the gate reader can't tell the two apart. Use a different card.",
};

/** Longer than any serial, typed or scanned; stops a huge string before any work is done. */
const MAX_RAW_SERIAL_LENGTH = 64;

const MAX_SERIAL_GENERATION_ATTEMPTS = 5;

/**
 * Whether a card the reader read (or a serial typed by hand) could be
 * linked at this school: the stored form of its serial, or why not.
 * Reads only; linking happens on Save.
 */
export async function checkSerial(
  schoolId: string,
  rawSerial: unknown,
  deps: Deps = defaultDeps,
): Promise<{ ok: true; serial: string } | { ok: false; message: string }> {
  const serial =
    typeof rawSerial === "string" && rawSerial.length <= MAX_RAW_SERIAL_LENGTH ? normalizeCardSerial(rawSerial) : null;
  if (!serial) return { ok: false, message: NOT_A_SERIAL };

  const [sameSerial, sameFirstBytes] = await Promise.all([
    deps.cards.getBySerial(serial),
    deps.cards.listBySerialPrefix(schoolId, firstFourBytes(serial)),
  ]);
  const conflict = findSerialConflict(serial, sameSerial, sameFirstBytes);
  return conflict ? { ok: false, message: CONFLICT_MESSAGE[conflict] } : { ok: true, serial };
}

/** A made-up serial for "Simulate a card tap" (Step 16) that no active card has. */
async function freeSimulatedSerial(deps: Deps): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_SERIAL_GENERATION_ATTEMPTS; attempt++) {
    const serial = generateCardSerial();
    const existing = await deps.cards.getBySerial(serial);
    if (isSerialAvailable(serial, existing ? [existing] : [])) return serial;
  }
  return null;
}

export type PreparedCardChange =
  { ok: true; apply: (studentId: string) => Promise<void> } | { ok: false; message: string };

/**
 * Checks a pending card change before anything is saved, then hands back
 * the one function that saves it. `studentId` is null for a student who
 * doesn't exist yet (the Add form). Every check runs again here, because
 * another drawer may have linked the same card since the box checked it.
 */
export async function prepareCardChange(
  schoolId: string,
  studentId: string | null,
  change: PendingCard,
  deps: Deps = defaultDeps,
): Promise<PreparedCardChange> {
  if (!change.replaceLost && !change.link) return { ok: true, apply: async () => {} };

  const active = studentId ? await deps.cards.getActiveForStudent(schoolId, studentId) : null;
  if (change.replaceLost && !active) return { ok: false, message: "This student has no linked card to replace." };
  if (change.link && active && !change.replaceLost) {
    return { ok: false, message: "This student already has a linked card. Replace it instead." };
  }

  let serial: string | null = null;
  if (change.link?.kind === "reader") {
    const checked = await checkSerial(schoolId, change.link.serial, deps);
    if (!checked.ok) return checked;
    serial = checked.serial;
  } else if (change.link?.kind === "simulated") {
    serial = await freeSimulatedSerial(deps);
    if (!serial) return { ok: false, message: "Couldn't make a free card serial. Try again." };
  }

  return {
    ok: true,
    apply: async (savedStudentId) => {
      if (change.replaceLost && active) await deps.cards.markLost(schoolId, active.id);
      if (serial) {
        await deps.cards.create({
          id: crypto.randomUUID(),
          schoolId,
          studentId: savedStudentId,
          serial,
          status: "active",
          linkedAt: new Date().toISOString(),
        });
      }
    },
  };
}
