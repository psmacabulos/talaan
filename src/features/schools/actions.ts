"use server";

import { refresh } from "next/cache";
import { schoolRepository } from "@/data/repositories";
import { getSession } from "@/lib/session";
import { notificationPreferenceSchema } from "./schemas";
import type { NotificationPreference } from "./types";

export type NotificationSettingsActionResult =
  | { ok: true }
  | { ok: false; formError?: string };

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
