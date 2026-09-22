"use server";

import { refresh } from "next/cache";
import { getSession } from "@/lib/session";
import { cardRepository, studentRepository } from "@/data/repositories";
import { generateCardSerial, isSerialAvailable } from "./card-serial";
import type { Card } from "./types";

export type CardActionResult = { ok: true; card: Card } | { ok: false; formError: string };

const MAX_SERIAL_GENERATION_ATTEMPTS = 5;

async function lookupBySerial(serial: string): Promise<Card[]> {
  const existing = await cardRepository.getBySerial(serial);
  return existing ? [existing] : [];
}

async function assertCanManageCards(studentId: string): Promise<{ ok: true; schoolId: string } | { ok: false; formError: string }> {
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
