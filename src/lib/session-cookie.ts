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
 * The cookie's value, signed and expiring 30 days after `now`. Kept apart
 * from session.ts (which reads Next.js's cookie store and the database) so
 * the browser tests can make the same cookie (e2e/sessions.ts).
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
