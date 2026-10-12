"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { schoolRepository, staffRepository } from "@/data/repositories";
import { DEFAULT_ATTENDANCE_TIMES, type AttendanceTimes } from "@/features/attendance/status";
import { SIGNED_OUT_MESSAGE } from "@/features/auth/messages";
import { EMAIL_IN_USE_MESSAGE } from "@/features/staff/messages";
import { makeSignInLink, type SignInLink } from "@/features/staff/sign-in-link";
import { getSession, startStaffSession } from "@/lib/session";
import { clearThemeOverride } from "@/lib/theme/theme-override-actions";
import { attendanceTimesSchema, createSchoolSchema, notificationPreferenceSchema, schoolThemeSchema } from "./schemas";
import type { CreateSchoolFormInput, NotificationPreference, SchoolTheme } from "./types";

export type NotificationSettingsActionResult = { ok: true } | { ok: false; formError?: string };

export type AttendanceTimesFieldErrors = Partial<Record<keyof AttendanceTimes, string>>;

export type AttendanceTimesActionResult =
  { ok: true } | { ok: false; formError?: string; fieldErrors?: AttendanceTimesFieldErrors };

export type AppearanceSettingsActionResult = { ok: true } | { ok: false; formError: string };

export type CreateSchoolFieldErrors = Partial<Record<keyof CreateSchoolFormInput, string>>;

export type CreateSchoolActionResult =
  { ok: true; principalLink: SignInLink } | { ok: false; formError?: string; fieldErrors?: CreateSchoolFieldErrors };

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
  if (!session) return { ok: false, formError: SIGNED_OUT_MESSAGE };
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
 * Step 44.5's "Save" on Settings > Attendance times. Re-validates with the
 * same `attendanceTimesSchema` the form already checked (CLAUDE.md:
 * "validated on both sides"), including "absent after late", and hands any
 * field message back so the form can show it under the right input.
 */
export async function updateAttendanceTimes(times: AttendanceTimes): Promise<AttendanceTimesActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, formError: SIGNED_OUT_MESSAGE };
  if (!session.schoolId || session.role === "teacher") {
    return { ok: false, formError: "You don't have permission to change attendance times." };
  }

  const parsed = attendanceTimesSchema.safeParse(times);
  if (!parsed.success) {
    const fieldErrors: AttendanceTimesFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === "lateAfter" || field === "absentFrom") && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }

  const school = await schoolRepository.getById(session.schoolId);
  if (!school) {
    return { ok: false, formError: "Your school could not be found." };
  }

  await schoolRepository.update({ ...school, ...parsed.data });

  refresh();
  return { ok: true };
}

/**
 * Step 26's "Save" on Settings > Appearance. Re-validates the theme with
 * the same `schoolThemeSchema` the form already checked (CLAUDE.md:
 * "validated on both sides") — a bad hex color is rejected here too, not
 * just in the browser. A valid but hard-to-read custom color is not
 * rejected: generateCustomPalette corrects it wherever it's applied, and
 * the form has already shown the school what the correction looks like.
 *
 * Also clears the top-bar dropdown's preview cookie, so the principal sees
 * the theme they just saved rather than whatever they were previewing.
 */
export async function updateSchoolTheme(theme: SchoolTheme): Promise<AppearanceSettingsActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, formError: SIGNED_OUT_MESSAGE };
  if (!session.schoolId || session.role === "teacher") {
    return { ok: false, formError: "You don't have permission to change this school's theme." };
  }

  const parsed = schoolThemeSchema.safeParse(theme);
  if (!parsed.success) {
    return {
      ok: false,
      formError: parsed.error.issues[0]?.message ?? "That isn't a valid theme.",
    };
  }

  const school = await schoolRepository.getById(session.schoolId);
  if (!school) {
    return { ok: false, formError: "Your school could not be found." };
  }

  await schoolRepository.update({ ...school, theme: parsed.data });
  await clearThemeOverride();

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
  if (!session) return { ok: false, formError: SIGNED_OUT_MESSAGE };
  if (session.role !== "super_admin") {
    return { ok: false, formError: "Only a super admin can add a school." };
  }

  const parsed = createSchoolSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: createSchoolFieldErrorsFrom(parsed.error) };
  }

  const { name, principalFirstName, principalLastName, presetId, logoUrl } = parsed.data;
  // Checked before the school is made, so a refused email never leaves a
  // school with no principal behind (same rule as inviteStaff).
  const principalEmail = parsed.data.principalEmail.trim().toLowerCase();
  if (await staffRepository.findByEmail(principalEmail)) {
    return { ok: false, fieldErrors: { principalEmail: EMAIL_IN_USE_MESSAGE } };
  }
  const schoolId = crypto.randomUUID();

  await schoolRepository.create({
    id: schoolId,
    name,
    theme: { kind: "preset", presetId },
    logoUrl,
    // A new school starts with the DepEd logo off (permission still
    // pending), time-in-only notifications and the default attendance
    // times; its principal changes any of them later on the Settings page.
    showDepedLogo: false,
    notificationPreference: "time_in_only",
    ...DEFAULT_ATTENDANCE_TIMES,
  });

  const principal = await staffRepository.create({
    id: crypto.randomUUID(),
    schoolId,
    role: "principal",
    firstName: principalFirstName,
    lastName: principalLastName,
    email: principalEmail,
    status: "invited",
  });

  refresh();
  return { ok: true, principalLink: await makeSignInLink(principal) };
}

/**
 * Step 25's "Open" on a schools-list row. The super admin stays signed in
 * as themselves and views that school (Step 50): the signed cookie now
 * remembers which school (`school`), so every page shows that school's
 * data and colors, the dashboard says "Viewing …", and every action is
 * still the super admin's own. Clears any theme override so the school's
 * real theme shows, then lands on the dashboard.
 */
export async function openSchool(schoolId: string): Promise<OpenSchoolActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, formError: SIGNED_OUT_MESSAGE };
  if (session.role !== "super_admin") {
    return { ok: false, formError: "Only a super admin can open a school." };
  }

  const school = await schoolRepository.getById(schoolId);
  if (!school) {
    return { ok: false, formError: "That school no longer exists." };
  }

  await startStaffSession(session.userId, school.id);
  await clearThemeOverride();
  redirect("/dashboard");
}
