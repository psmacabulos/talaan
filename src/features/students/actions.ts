"use server";

import { refresh } from "next/cache";
import { SIGNED_OUT_MESSAGE } from "@/features/auth/messages";
import { getSession } from "@/lib/session";
import { studentRepository } from "@/data/repositories";
import { getPhotoStorage } from "@/lib/storage/photo-storage";
import { prepareCardChange, type PreparedCardChange } from "./card-changes";
import { newPhotoKey, PHOTO_CONTENT_TYPE } from "./photo";
import { readPhotoUpload } from "./photo-changes";
import { studentFormSchema } from "./schemas";
import { NO_STUDENT_CHANGES, studentChangesSchema, type StudentChanges } from "./student-changes";
import type { StudentFormInput } from "./types";

export type StudentFormFieldErrors = Partial<Record<keyof StudentFormInput, string>>;

/** `cardError` belongs in the ID card box; `formError` is anything else (shown as a toast). */
export type StudentFormActionResult =
  { ok: true } | { ok: false; formError?: string; fieldErrors?: StudentFormFieldErrors; cardError?: string };

function fieldErrorsFrom(error: import("zod").ZodError<StudentFormInput>): StudentFormFieldErrors {
  const flattened = error.flatten().fieldErrors;
  const fieldErrors: StudentFormFieldErrors = {};
  for (const key of Object.keys(flattened) as (keyof StudentFormInput)[]) {
    const [firstMessage] = flattened[key] ?? [];
    if (firstMessage) fieldErrors[key] = firstMessage;
  }
  return fieldErrors;
}

type Checked =
  | {
      ok: true;
      data: StudentFormInput;
      card: Extract<PreparedCardChange, { ok: true }>;
      photo: Extract<Awaited<ReturnType<typeof readPhotoUpload>>, { ok: true }>;
      removePhoto: boolean;
    }
  | { ok: false; result: StudentFormActionResult };

/**
 * Everything Save will do, checked before any of it is saved: the fields
 * (the same `studentFormSchema` the form used, CLAUDE.md "validated on both
 * sides"), the card change and the photo. A refused card or photo means
 * nothing at all is saved.
 */
async function checkEverything(
  schoolId: string,
  studentId: string | null,
  input: StudentFormInput,
  changes: unknown,
  photoForm: FormData | undefined,
): Promise<Checked> {
  const parsed = studentFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, result: { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) } };

  const parsedChanges = studentChangesSchema.safeParse(changes);
  if (!parsedChanges.success)
    return { ok: false, result: { ok: false, formError: "Something went wrong. Try again." } };

  const card = await prepareCardChange(schoolId, studentId, parsedChanges.data.card);
  if (!card.ok) return { ok: false, result: { ok: false, cardError: card.message } };

  const photo = await readPhotoUpload(photoForm);
  if (!photo.ok) return { ok: false, result: { ok: false, formError: photo.message } };

  return { ok: true, data: parsed.data, card, photo, removePhoto: parsedChanges.data.removePhoto };
}

/** Stores a new thumbnail and answers with its key; otherwise the key the student should keep (or none). */
async function storePhoto(
  schoolId: string,
  studentId: string,
  checked: Extract<Checked, { ok: true }>,
  currentKey: string | undefined,
): Promise<string | undefined> {
  const { photo } = checked.photo;
  if (photo) {
    const key = newPhotoKey(schoolId, studentId, photo.type);
    await getPhotoStorage().put(key, photo.bytes, PHOTO_CONTENT_TYPE[photo.type]);
    return key;
  }
  return checked.removePhoto ? undefined : currentKey;
}

/** The card is linked after the student is saved (a card needs its student to exist). */
async function applyCard(card: Extract<PreparedCardChange, { ok: true }>, studentId: string): Promise<string | null> {
  try {
    await card.apply(studentId);
    return null;
  } catch {
    return "The student was saved, but the card couldn't be linked. Open the student and try again.";
  }
}

/**
 * Step 15's "Add student". Since 2026-10-12 the same Save also stores the
 * photo and links the card chosen in the drawer, so a new student can be
 * added with both at once. Re-validates everything: a Server Function is
 * reachable by a direct request from anywhere, not just from this form.
 */
export async function createStudent(
  input: StudentFormInput,
  changes: StudentChanges = NO_STUDENT_CHANGES,
  photoForm?: FormData,
): Promise<StudentFormActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, formError: SIGNED_OUT_MESSAGE };
  if (!session.schoolId || session.role === "teacher") {
    return { ok: false, formError: "You don't have permission to add students." };
  }

  const checked = await checkEverything(session.schoolId, null, input, changes, photoForm);
  if (!checked.ok) return checked.result;

  const id = crypto.randomUUID();
  const photoKey = await storePhoto(session.schoolId, id, checked, undefined);
  await studentRepository.create({ id, schoolId: session.schoolId, ...checked.data, photoKey });
  const cardError = await applyCard(checked.card, id);

  refresh();
  return cardError ? { ok: false, formError: cardError } : { ok: true };
}

/**
 * Step 15's "Edit student", with the drawer's photo and card changes saved
 * by the same Save (2026-10-12): nothing in the drawer is saved before, and
 * Cancel throws all of it away. The old photo is deleted only once the
 * student points at the new one, so a failed save never leaves a student
 * pointing at nothing.
 */
export async function updateStudent(
  id: string,
  input: StudentFormInput,
  changes: StudentChanges = NO_STUDENT_CHANGES,
  photoForm?: FormData,
): Promise<StudentFormActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, formError: SIGNED_OUT_MESSAGE };
  if (!session.schoolId || session.role === "teacher") {
    return { ok: false, formError: "You don't have permission to edit students." };
  }

  const existing = await studentRepository.getById(id);
  if (!existing || existing.schoolId !== session.schoolId) {
    return { ok: false, formError: "That student could not be found." };
  }

  const checked = await checkEverything(session.schoolId, id, input, changes, photoForm);
  if (!checked.ok) return checked.result;

  const photoKey = await storePhoto(session.schoolId, id, checked, existing.photoKey);
  await studentRepository.update({ ...existing, ...checked.data, photoKey });
  if (existing.photoKey && existing.photoKey !== photoKey) await getPhotoStorage().delete(existing.photoKey);
  const cardError = await applyCard(checked.card, id);

  refresh();
  return cardError ? { ok: false, formError: cardError } : { ok: true };
}
