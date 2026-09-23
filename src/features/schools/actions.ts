"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { schoolRepository, staffRepository } from "@/data/repositories";
import { getSession } from "@/lib/session";
import { setDevSession } from "@/lib/session-actions";
import { clearThemeOverride } from "@/lib/theme/theme-override-actions";
import { createSchoolSchema, notificationPreferenceSchema } from "./schemas";
import type { CreateSchoolFormInput, NotificationPreference } from "./types";

export type NotificationSettingsActionResult =
  | { ok: true }
  | { ok: false; formError?: string };

export type CreateSchoolFieldErrors = Partial<Record<keyof CreateSchoolFormInput, string>>;

export type CreateSchoolActionResult =
  | { ok: true }
  | { ok: false; formError?: string; fieldErrors?: CreateSchoolFieldErrors };

/** Only failure returns — on success `openSchool` redirects instead. */
export type OpenSchoolActionResult = { ok: false; formError: string };

function createSchoolFieldErrorsFrom(error: import("zod").ZodError<CreateSchoolFormInput>): CreateSchoolFieldErrors {
  const flattened = error.flatten().fieldErrors;
  const fieldErrors: CreateSchoolFieldErrors = {};
  for (const key of Object.keys(flattened) as (keyof CreateSchoolFormInput)[]) {
    const [firstMessage] = flattened[key] ?? [];
    if (firstMessage) fieldErrors[key] = firstMessage;
  }
  return fieldErrors;
}

/**
 * Step 21's "Save" on Settings > Notifications. Re-validates with the same
 * `notificationPreferenceSchema` the client already checked (CLAUDE.md:
 * "validated on both sides") — a Server Function is reachable by a direct
 * request from anywhere, not just from the form that happens to call it,
 * the same reasoning `createStudent` (src/features/students/actions.ts)
 * documents.
 */
export async function updateNotificationPreference(
  preference: NotificationPreference,
): Promise<NotificationSettingsActionResult> {
  const session = await getSession();
  if (!session.schoolId || session.role === "teacher") {
    return { ok: false, formError: "You don't have permission to change notification settings." };
  }

  const parsed = notificationPreferenceSchema.safeParse(preference);
  if (!parsed.success) {
    return { ok: false, formError: "That isn't a valid notification preference." };
  }

  const school = await schoolRepository.getById(session.schoolId);
  if (!school) {
    return { ok: false, formError: "Your school could not be found." };
  }

  await schoolRepository.update({ ...school, notificationPreference: parsed.data });

  refresh();
  return { ok: true };
}

/**
 * Step 25's "Add school" (super admin only). Creates the school record and,
 * alongside it, the principal's invited account — the prototype's
 * "invite sent" behavior, so a brand-new school can be opened right away
 * by `openSchool` below instead of waiting for a real sign-in (Phase 2).
 * No real invitation email goes out; the invited principal is just added
 * with `status: "invited"`, exactly like Step 18's `inviteStaff`.
 *
 * Re-validates with the same `createSchoolSchema` the client already
 * checked (CLAUDE.md: "validated on both sides").
 */
export async function createSchool(input: CreateSchoolFormInput): Promise<CreateSchoolActionResult> {
  const session = await getSession();
  if (session.role !== "super_admin") {
    return { ok: false, formError: "Only a super admin can add a school." };
  }

  const parsed = createSchoolSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: createSchoolFieldErrorsFrom(parsed.error) };
  }

  const { name, principalFirstName, principalLastName, principalEmail, presetId, logoUrl } = parsed.data;
  const schoolId = crypto.randomUUID();

  await schoolRepository.create({
    id: schoolId,
    name,
    theme: { kind: "preset", presetId },
    logoUrl,
    // A new school starts with the DepEd logo off (permission still
    // pending) and time-in-only notifications; its principal changes
    // either later on the Settings page.
    showDepedLogo: false,
    notificationPreference: "time_in_only",
  });

  await staffRepository.create({
    id: crypto.randomUUID(),
    schoolId,
    role: "principal",
    firstName: principalFirstName,
    lastName: principalLastName,
    email: principalEmail,
    status: "invited",
  });

  refresh();
  return { ok: true };
}

/**
 * Step 25's "Open" on a schools-list row (super admin only, dev builds).
 * The prototype's "open a school" — switch the dev session to that
 * school's principal, clear any theme override so the school's own real
 * theme shows (the same pair of calls the Step 11 dev switcher makes),
 * then land on the dashboard the way that principal sees it: their
 * school's colors, logo and data.
 */
export async function openSchool(schoolId: string): Promise<OpenSchoolActionResult> {
  const session = await getSession();
  if (session.role !== "super_admin") {
    return { ok: false, formError: "Only a super admin can open a school." };
  }

  const staff = await staffRepository.listBySchool(schoolId);
  const principal = staff.find((member) => member.role === "principal");
  if (!principal) {
    return { ok: false, formError: "This school has no principal account to open yet." };
  }

  await setDevSession(principal.id);
  await clearThemeOverride();
  redirect("/dashboard");
}
