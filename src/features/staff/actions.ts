"use server";

import { refresh } from "next/cache";
import { staffRepository } from "@/data/repositories";
import { getSession } from "@/lib/session";
import { staffFormSchema } from "./schemas";
import type { StaffFormInput } from "./types";

export type StaffFormFieldErrors = Partial<Record<keyof StaffFormInput, string>>;

export type StaffFormActionResult =
  | { ok: true }
  | { ok: false; formError?: string; fieldErrors?: StaffFormFieldErrors };

function fieldErrorsFrom(error: import("zod").ZodError<StaffFormInput>): StaffFormFieldErrors {
  const flattened = error.flatten().fieldErrors;
  const fieldErrors: StaffFormFieldErrors = {};
  for (const key of Object.keys(flattened) as (keyof StaffFormInput)[]) {
    const [firstMessage] = flattened[key] ?? [];
    if (firstMessage) fieldErrors[key] = firstMessage;
  }
  return fieldErrors;
}

/**
 * Step 18's "Invite staff". Re-validates with the same `staffFormSchema`
 * the client already checked (CLAUDE.md: "validated on both sides") — a
 * Server Function is reachable directly, not just from the form that
 * happens to call it, same reasoning as `createStudent`
 * (src/features/students/actions.ts).
 *
 * No real invitation email goes out — Phase 1 has no backend to send one.
 * The invited person is just added with `status: "invited"`, which is
 * exactly what this step's "Done when" line asks for.
 */
export async function inviteStaff(input: StaffFormInput): Promise<StaffFormActionResult> {
  const session = await getSession();
  if (!session.schoolId || session.role === "teacher") {
    return { ok: false, formError: "You don't have permission to invite staff." };
  }

  const parsed = staffFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { advisoryGradeLevel, advisorySection, ...rest } = parsed.data;

  await staffRepository.create({
    id: crypto.randomUUID(),
    schoolId: session.schoolId,
    status: "invited",
    // A principal has no advisory class — only keep these fields for an
    // invited teacher, even if the form somehow submitted them anyway.
    ...(rest.role === "teacher" ? { advisoryGradeLevel, advisorySection } : {}),
    ...rest,
  });

  refresh();
  return { ok: true };
}
