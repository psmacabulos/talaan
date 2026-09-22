"use server";

import { refresh } from "next/cache";
import { getSession } from "@/lib/session";
import { studentRepository } from "@/data/repositories";
import { studentFormSchema } from "./schemas";
import type { StudentFormInput } from "./types";

export type StudentFormFieldErrors = Partial<Record<keyof StudentFormInput, string>>;

export type StudentFormActionResult =
  | { ok: true }
  | { ok: false; formError?: string; fieldErrors?: StudentFormFieldErrors };

function fieldErrorsFrom(error: import("zod").ZodError<StudentFormInput>): StudentFormFieldErrors {
  const flattened = error.flatten().fieldErrors;
  const fieldErrors: StudentFormFieldErrors = {};
  for (const key of Object.keys(flattened) as (keyof StudentFormInput)[]) {
    const [firstMessage] = flattened[key] ?? [];
    if (firstMessage) fieldErrors[key] = firstMessage;
  }
  return fieldErrors;
}

/**
 * Step 15's "Add student". Re-validates with the same `studentFormSchema`
 * the client already checked (CLAUDE.md: "validated on both sides") —
 * defense in depth, since a Server Function is reachable by a direct
 * request from anywhere, not just from the form that happens to call it
 * (the same reasoning `assertDevSessionMutationAllowed` documents in
 * `src/lib/session.ts`).
 */
export async function createStudent(input: StudentFormInput): Promise<StudentFormActionResult> {
  const session = await getSession();
  if (!session.schoolId || session.role === "teacher") {
    return { ok: false, formError: "You don't have permission to add students." };
  }

  const parsed = studentFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  await studentRepository.create({
    id: crypto.randomUUID(),
    schoolId: session.schoolId,
    ...parsed.data,
  });

  refresh();
  return { ok: true };
}

/** Step 15's "Edit student". Same guards and re-validation as `createStudent`. */
export async function updateStudent(id: string, input: StudentFormInput): Promise<StudentFormActionResult> {
  const session = await getSession();
  if (!session.schoolId || session.role === "teacher") {
    return { ok: false, formError: "You don't have permission to edit students." };
  }

  const existing = await studentRepository.getById(id);
  if (!existing || existing.schoolId !== session.schoolId) {
    return { ok: false, formError: "That student could not be found." };
  }

  const parsed = studentFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  await studentRepository.update({ ...existing, ...parsed.data });

  refresh();
  return { ok: true };
}
