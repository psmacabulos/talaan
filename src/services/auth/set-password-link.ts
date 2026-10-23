import { z } from "zod";
import type { StaffRepository } from "@/data/repositories";
import { SET_PASSWORD_LINK_DAYS } from "@/features/auth/set-password-rules";
import type { Staff } from "@/features/staff/types";
import { passwordVersion } from "@/lib/password";
import { readSignedValue, signValue } from "@/lib/signed-value";

const tokenSchema = z.object({ staffId: z.string().min(1), pv: z.string().min(1) });

/**
 * The token inside a set-password link (Step 50.5): a signed
 * `{ staffId, pv, exp }` with its own purpose, so a session cookie never
 * works as a link or the other way round. `pv` is the password fingerprint
 * when the link was made ("none" for an invited account). Setting a
 * password changes it, so the link works only once, with no table of
 * used links. A principal's link lasts 7 days; an emailed one passes
 * `validForSeconds` (Step 55.5).
 */
export function makeSetPasswordToken(
  staffId: string,
  passwordHash: string | null,
  secret: string,
  now: Date,
  validForSeconds = SET_PASSWORD_LINK_DAYS * 24 * 60 * 60,
): string {
  const exp = Math.floor(now.getTime() / 1000) + validForSeconds;
  return signValue({ staffId, pv: passwordVersion(passwordHash), exp }, "set-password", secret);
}

/**
 * The staff member a token is for, or null: a wrong stamp, another purpose,
 * expired, already used (the password changed since), or the account was
 * removed. Read again when the form is sent, since it may have expired
 * while the page was open.
 */
export async function readSetPasswordToken(
  token: string | undefined,
  deps: { staff: StaffRepository; secret: string; now: Date },
): Promise<Staff | null> {
  const parsed = tokenSchema.safeParse(readSignedValue(token, "set-password", deps.secret, deps.now));
  if (!parsed.success) return null;

  const found = await deps.staff.getForSession(parsed.data.staffId);
  if (!found || passwordVersion(found.passwordHash) !== parsed.data.pv) return null;
  return found.staff;
}

/** The link's path. The caller puts the site's own address in front of it. */
export function setPasswordPath(token: string): string {
  return `/set-password?token=${encodeURIComponent(token)}`;
}

/** The whole link for an email (Step 55.5), on `APP_URL` (src/lib/env.ts), never the request's own address. */
export function setPasswordUrl(token: string, appUrl: string): string {
  return new URL(setPasswordPath(token), appUrl).toString();
}
