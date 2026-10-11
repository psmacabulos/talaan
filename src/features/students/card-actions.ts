"use server";

import { refresh } from "next/cache";
import { getSession } from "@/lib/session";
import { cardRepository, studentRepository } from "@/data/repositories";
import {
  findSerialConflict,
  firstFourBytes,
  generateCardSerial,
  isSerialAvailable,
  normalizeCardSerial,
  type SerialConflict,
} from "./card-serial";
import type { Card } from "./types";

export type CardActionResult = { ok: true; card: Card } | { ok: false; formError: string };

/** `fieldError` belongs under the serial field; `formError` is anything else (shown as a toast). */
export type LinkRealCardResult = { ok: true; card: Card } | { ok: false; fieldError?: string; formError?: string };

const NOT_A_SERIAL = "That isn't a card serial. Tap the card on the reader, or type its serial, like 53:2E:98:0C.";

const CONFLICT_MESSAGE: Record<SerialConflict, string> = {
  linked: "This card is already linked to another student.",
  used_before: "This card was reported lost or retired, so it can't be linked again. Use a different card.",
  same_first_bytes:
    "Another student's card starts with the same 4 bytes, and the gate reader can't tell the two apart. Use a different card.",
};

/** Longer than any serial, typed or scanned; stops a huge string before any work is done. */
const MAX_RAW_SERIAL_LENGTH = 64;

const MAX_SERIAL_GENERATION_ATTEMPTS = 5;

async function lookupBySerial(serial: string): Promise<Card[]> {
  const existing = await cardRepository.getBySerial(serial);
  return existing ? [existing] : [];
}

async function assertCanManageCards(
  studentId: string,
): Promise<{ ok: true; schoolId: string } | { ok: false; formError: string }> {
  const session = await getSession();
  if (!session.schoolId || session.role === "teacher") {
    return { ok: false, formError: "You don't have permission to manage ID cards." };
  }

  const student = await studentRepository.getById(studentId);
  if (!student || student.schoolId !== session.schoolId) {
    return { ok: false, formError: "That student could not be found." };
  }

  return { ok: true, schoolId: session.schoolId };
}

/**
 * "Simulate a card tap" (Step 16), for a student with no active card
 * (either never had one, or their last one was just marked lost). Server
 * generates the serial itself — this stands in for a real station
 * reporting whatever UID it actually read — and refuses a serial an
 * active card elsewhere already has (`isSerialAvailable`), retrying a
 * handful of times rather than failing on the first collision, which in
 * practice never happens with a random 7-byte UID.
 */
export async function linkCard(studentId: string): Promise<CardActionResult> {
  const guard = await assertCanManageCards(studentId);
  if (!guard.ok) return guard;

  const existingActive = await cardRepository.getActiveForStudent(studentId);
  if (existingActive) {
    return { ok: false, formError: "This student already has a linked card. Replace it instead." };
  }

  let serial = generateCardSerial();
  let available = isSerialAvailable(serial, await lookupBySerial(serial));
  for (let attempt = 1; !available && attempt < MAX_SERIAL_GENERATION_ATTEMPTS; attempt++) {
    serial = generateCardSerial();
    available = isSerialAvailable(serial, await lookupBySerial(serial));
  }

  if (!available) {
    return { ok: false, formError: "Couldn't generate a free card serial — try again." };
  }

  const card = await cardRepository.create({
    id: crypto.randomUUID(),
    schoolId: guard.schoolId,
    studentId,
    serial,
    status: "active",
    linkedAt: new Date().toISOString(),
  });

  refresh();
  return { ok: true, card };
}

/**
 * "Link card" with a real card (Step 44.7): the USB reader types the
 * card's 10 digits into the drawer's serial field and presses Enter, or a
 * person types hex from an NFC app. `normalizeCardSerial` turns either into
 * the stored form, the same function the gate uses (Step 45), so a card
 * linked here is the card the gate finds.
 */
export async function linkRealCard(studentId: string, rawSerial: string): Promise<LinkRealCardResult> {
  const guard = await assertCanManageCards(studentId);
  if (!guard.ok) return guard;

  const serial =
    typeof rawSerial === "string" && rawSerial.length <= MAX_RAW_SERIAL_LENGTH ? normalizeCardSerial(rawSerial) : null;
  if (!serial) return { ok: false, fieldError: NOT_A_SERIAL };

  const existingActive = await cardRepository.getActiveForStudent(studentId);
  if (existingActive) {
    return { ok: false, formError: "This student already has a linked card. Replace it instead." };
  }

  const [sameSerial, sameFirstBytes] = await Promise.all([
    cardRepository.getBySerial(serial),
    cardRepository.listBySerialPrefix(guard.schoolId, firstFourBytes(serial)),
  ]);
  const conflict = findSerialConflict(serial, sameSerial, sameFirstBytes);
  if (conflict) return { ok: false, fieldError: CONFLICT_MESSAGE[conflict] };

  const card = await cardRepository.create({
    id: crypto.randomUUID(),
    schoolId: guard.schoolId,
    studentId,
    serial,
    status: "active",
    linkedAt: new Date().toISOString(),
  });

  refresh();
  return { ok: true, card };
}

/** "Card lost? Replace it" (Step 16) — marks the current active card lost; linking the replacement is a separate `linkCard` call once the drawer moves to "waiting". */
export async function replaceCard(studentId: string): Promise<CardActionResult> {
  const guard = await assertCanManageCards(studentId);
  if (!guard.ok) return guard;

  const existingActive = await cardRepository.getActiveForStudent(studentId);
  if (!existingActive) {
    return { ok: false, formError: "This student has no linked card to replace." };
  }

  const updated = await cardRepository.markLost(existingActive.id);
  if (!updated) {
    return { ok: false, formError: "That card could not be found." };
  }

  refresh();
  return { ok: true, card: updated };
}
