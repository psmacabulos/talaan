"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { SIGNED_OUT_MESSAGE } from "@/features/auth/messages";
import { getSession } from "@/lib/session";
import { deleteStudent } from "@/services/students/student-privacy";
import { NOT_ALLOWED_MESSAGE, NOT_FOUND_MESSAGE, WRONG_CONFIRMATION_MESSAGE } from "./privacy-messages";

export type DeleteStudentActionResult = { ok: true } | { ok: false; error: string };

/** The two things the dialog sends. A Server Function can be called with anything, so they're checked again. */
const argumentsSchema = z.object({ studentId: z.string().min(1).max(64), confirmation: z.string().max(200) });

/**
 * "Delete this student" from the drawer (Step 60.3). `deleteStudent` holds
 * the rules, including the typed name, which is checked on the server. The
 * school is always the session's own. Nothing about the student is logged
 * here or in the answer except what the person already typed.
 */
export async function deleteStudentAction(
  studentId: unknown,
  confirmation: unknown,
): Promise<DeleteStudentActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: SIGNED_OUT_MESSAGE };

  const parsed = argumentsSchema.safeParse({ studentId, confirmation });
  if (!parsed.success) return { ok: false, error: WRONG_CONFIRMATION_MESSAGE };

  const result = await deleteStudent(session, parsed.data.studentId, parsed.data.confirmation);
  if (!result.ok) {
    if (result.code === "forbidden") return { ok: false, error: NOT_ALLOWED_MESSAGE };
    if (result.code === "wrong_confirmation") return { ok: false, error: WRONG_CONFIRMATION_MESSAGE };
    return { ok: false, error: NOT_FOUND_MESSAGE };
  }

  refresh();
  return { ok: true };
}
