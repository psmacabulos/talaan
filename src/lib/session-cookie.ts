import { z } from "zod";
import { readSignedValue, signValue } from "./signed-value";

export const SESSION_COOKIE = "talaan_session";

/** A session lasts 30 days, then you sign in again (owner decision, 2026-10-11). */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * What the staff session cookie says, once its stamp checks out:
 * - `staffId`: who signed in;
 * - `pv`: their password fingerprint (`passwordVersion`), so a new password signs out old cookies;
 * - `school`: the school a super admin is viewing. Ignored for everyone else (src/lib/session.ts).
 */
const staffSessionCookieSchema = z.object({
  staffId: z.string().min(1),
  pv: z.string().min(1),
  school: z.string().min(1).optional(),
});

export type StaffSessionCookie = z.infer<typeof staffSessionCookieSchema>;

/**
 * The cookie's value, signed and expiring 30 days after `now`. This file is
 * kept apart from session.ts and parent-session.ts (which read Next.js's
 * cookie store and the database) so the browser tests can make the same
 * cookies (e2e/sessions.ts).
 */
export function makeStaffSessionCookie(contents: StaffSessionCookie, secret: string, now: Date): string {
  const exp = Math.floor(now.getTime() / 1000) + SESSION_MAX_AGE_SECONDS;
  return signValue({ ...contents, exp }, "staff-session", secret);
}

/** The cookie's contents, or null when it's missing, forged, expired or the wrong shape. */
export function readStaffSessionCookie(raw: string | undefined, secret: string, now: Date): StaffSessionCookie | null {
  const parsed = staffSessionCookieSchema.safeParse(readSignedValue(raw, "staff-session", secret, now));
  return parsed.success ? parsed.data : null;
}

/** The parent web portal's session (Step 50.1). The Expo app uses a bearer token instead (Step 53). */
export const PARENT_SESSION_COOKIE = "talaan_parent_session";

const parentSessionCookieSchema = z.object({ parentId: z.string().min(1) });

/** Signed with its own purpose, so a staff cookie never works as a parent one, or the other way round. Also 30 days. */
export function makeParentSessionCookie(parentId: string, secret: string, now: Date): string {
  const exp = Math.floor(now.getTime() / 1000) + SESSION_MAX_AGE_SECONDS;
  return signValue({ parentId, exp }, "parent-session", secret);
}

/** The parent id, or null when the cookie is missing, forged, expired or the wrong shape. */
export function readParentSessionCookie(raw: string | undefined, secret: string, now: Date): string | null {
  const parsed = parentSessionCookieSchema.safeParse(readSignedValue(raw, "parent-session", secret, now));
  return parsed.success ? parsed.data.parentId : null;
}
