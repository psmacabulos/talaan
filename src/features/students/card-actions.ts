"use server";

import { getSession } from "@/lib/session";
import { checkSerial } from "./card-changes";

export type CheckCardSerialResult =
  { ok: true; serial: string } | { ok: false; fieldError?: string; formError?: string };

/**
 * The drawer's Card serial field (Step 44.7): the USB reader types a card's
 * 10 digits and presses Enter, or a person types hex from an NFC app. This
 * only checks the card and answers with its stored form, through the same
 * `normalizeCardSerial` the gate uses (Step 45), so a refused card says why
 * at once. Nothing is linked until the student form is saved (2026-10-12).
 */
export async function checkCardSerial(rawSerial: string): Promise<CheckCardSerialResult> {
  const session = await getSession();
  if (!session.schoolId || session.role === "teacher") {
    return { ok: false, formError: "You don't have permission to manage ID cards." };
  }

  const checked = await checkSerial(session.schoolId, rawSerial);
  return checked.ok ? checked : { ok: false, fieldError: checked.message };
}
