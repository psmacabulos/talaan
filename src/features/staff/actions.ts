"use server";

import { refresh } from "next/cache";
import { staffRepository } from "@/data/repositories";
import { SIGNED_OUT_MESSAGE } from "@/features/auth/messages";
import { getSession } from "@/lib/session";
import { EMAIL_IN_USE_MESSAGE } from "./messages";
import { staffRowActions } from "./row-actions";
import { makeSignInLink, type SignInLink } from "./sign-in-link";
import { staffFormSchema } from "./schemas";
import type { Staff, StaffFormInput } from "./types";

export type StaffFormFieldErrors = Partial<Record<keyof StaffFormInput, string>>;

export type StaffFormActionResult =
  { ok: true; link: SignInLink } | { ok: false; formError?: string; fieldErrors?: StaffFormFieldErrors };

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
 * No email goes out: the answer carries a set-password link (Step 50.5)
 * that the principal sends however they like. The person stays
 * `invited`, with no password, until they use it.
 */
export async function inviteStaff(input: StaffFormInput): Promise<StaffFormActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, formError: SIGNED_OUT_MESSAGE };
  if (!session.schoolId || session.role === "teacher") {
    return { ok: false, formError: "You don't have permission to invite staff." };
  }

  const parsed = staffFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { advisoryGradeLevel, advisorySection, ...rest } = parsed.data;
  // Stored in lower case, and one account per email across every school
  // (Step 50), so sign-in finds exactly one person.
  const email = rest.email.trim().toLowerCase();
  if (await staffRepository.findByEmail(email)) {
    return { ok: false, fieldErrors: { email: EMAIL_IN_USE_MESSAGE } };
  }

  const staff = await staffRepository.create({
    id: crypto.randomUUID(),
    schoolId: session.schoolId,
    status: "invited",
    // A principal has no advisory class — only keep these fields for an
    // invited teacher, even if the form somehow submitted them anyway.
    ...(rest.role === "teacher" ? { advisoryGradeLevel, advisorySection } : {}),
    ...rest,
    email,
  });

  refresh();
  return { ok: true, link: await makeSignInLink(staff) };
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
  if (!session) return { error: SIGNED_OUT_MESSAGE };
  if (!session.schoolId || session.role === "teacher") {
    return { error: "You don't have permission to manage staff." };
  }

  const staff = await staffRepository.getById(staffId);
  if (!staff || staff.schoolId !== session.schoolId) {
    return { error: "That staff member no longer exists." };
  }

  return { staff, userId: session.userId };
}

export type SignInLinkActionResult = { ok: true; link: SignInLink } | { ok: false; error: string };

/**
 * The ⋮ menu's "Copy sign-in link" (an invited account) or "Copy password
 * reset link" (an active one), Step 50.5. Only for staff at the caller's
 * own school, and never for the caller themselves: they're signed in
 * already. Using a reset link signs that person out everywhere else,
 * through the session's password fingerprint.
 */
export async function createSignInLink(staffId: string): Promise<SignInLinkActionResult> {
  const target = await findActionTarget(staffId);
  if ("error" in target) return { ok: false, error: target.error };

  if (!staffRowActions(target.staff, target.userId).canMakeLink) {
    return { ok: false, error: "You can't make a link for your own account." };
  }

  return { ok: true, link: await makeSignInLink(target.staff) };
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
