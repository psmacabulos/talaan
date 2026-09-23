"use server";

import { refresh } from "next/cache";
import { staffRepository } from "@/data/repositories";
import { getSession } from "@/lib/session";
import { staffRowActions } from "./row-actions";
import { staffFormSchema } from "./schemas";
import type { Staff, StaffFormInput } from "./types";

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

export type StaffRowActionResult = { ok: true } | { ok: false; error: string };

/**
 * Looks up the staff member a ⋮ menu action targets, refusing anything the
 * signed-in person couldn't have been offered: a teacher, a school-less
 * session, or someone at another school (Phase 2 enforces the same rule
 * in the database).
 */
async function findActionTarget(staffId: string): Promise<{ staff: Staff; userId: string } | { error: string }> {
  const session = await getSession();
  if (!session.schoolId || session.role === "teacher") {
    return { error: "You don't have permission to manage staff." };
  }

  const staff = await staffRepository.getById(staffId);
  if (!staff || staff.schoolId !== session.schoolId) {
    return { error: "That staff member no longer exists." };
  }

  return { staff, userId: session.userId };
}

/**
 * Step 27.6's "Resend invitation". Like `inviteStaff`, no real email goes
 * out in Phase 1 — this only checks the invite is still pending, so the
 * menu's toast is honest about what would have happened.
 */
export async function resendStaffInvite(staffId: string): Promise<StaffRowActionResult> {
  const target = await findActionTarget(staffId);
  if ("error" in target) return { ok: false, error: target.error };

  if (!staffRowActions(target.staff, target.userId).canResend) {
    return { ok: false, error: "This person has already accepted their invitation." };
  }

  return { ok: true };
}

/** Step 27.6's "Remove". The menu asks for confirmation first; this re-checks the same rules. */
export async function removeStaff(staffId: string): Promise<StaffRowActionResult> {
  const target = await findActionTarget(staffId);
  if ("error" in target) return { ok: false, error: target.error };

  if (!staffRowActions(target.staff, target.userId).canRemove) {
    return { ok: false, error: "You can't remove your own account." };
  }

  await staffRepository.remove(staffId);
  refresh();
  return { ok: true };
}
