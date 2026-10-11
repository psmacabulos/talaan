"use server";

import { refresh } from "next/cache";
import { studentRepository } from "@/data/repositories";
import { getSession } from "@/lib/session";
import { getPhotoStorage } from "@/lib/storage/photo-storage";
import { detectPhotoType, MAX_PHOTO_BYTES, newPhotoKey, PHOTO_CONTENT_TYPE } from "./photo";
import type { Student } from "./types";

export type PhotoActionResult = { ok: true; student: Student } | { ok: false; formError: string };

const UNUSABLE = "That photo couldn't be used. Try another one.";

async function studentYouManage(
  studentId: string,
): Promise<{ ok: true; student: Student } | { ok: false; formError: string }> {
  const session = await getSession();
  if (!session.schoolId || session.role === "teacher") {
    return { ok: false, formError: "You don't have permission to change student photos." };
  }
  const student = await studentRepository.getById(studentId);
  if (!student || student.schoolId !== session.schoolId) {
    return { ok: false, formError: "That student could not be found." };
  }
  return { ok: true, student };
}

/**
 * The drawer's "Take or choose a photo" (Step 46.5). The browser has
 * already cropped and shrunk it to a 256×256 thumbnail; this checks that's
 * really what arrived (size, and the file's own first bytes, not the type
 * the browser claims), stores it under a new key, points the student at
 * it, and only then deletes the old one, so a failed upload never leaves a
 * student pointing at nothing.
 */
export async function uploadStudentPhoto(studentId: string, formData: FormData): Promise<PhotoActionResult> {
  const guard = await studentYouManage(studentId);
  if (!guard.ok) return guard;

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_PHOTO_BYTES) {
    return { ok: false, formError: UNUSABLE };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectPhotoType(bytes);
  if (!type) return { ok: false, formError: UNUSABLE };

  const { student } = guard;
  const storage = getPhotoStorage();
  const key = newPhotoKey(student.schoolId, student.id, type);
  await storage.put(key, bytes, PHOTO_CONTENT_TYPE[type]);

  const updated = await studentRepository.update({ ...student, photoKey: key });
  if (!updated) return { ok: false, formError: "That student could not be found." };
  if (student.photoKey) await storage.delete(student.photoKey);

  refresh();
  return { ok: true, student: updated };
}

/** "Remove photo", after the drawer's confirm. */
export async function removeStudentPhoto(studentId: string): Promise<PhotoActionResult> {
  const guard = await studentYouManage(studentId);
  if (!guard.ok) return guard;

  const { student } = guard;
  const updated = await studentRepository.update({ ...student, photoKey: undefined });
  if (!updated) return { ok: false, formError: "That student could not be found." };
  if (student.photoKey) await getPhotoStorage().delete(student.photoKey);

  refresh();
  return { ok: true, student: updated };
}
