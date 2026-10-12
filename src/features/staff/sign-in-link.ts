import { staffRepository } from "@/data/repositories";
import { sessionSecret } from "@/lib/env";
import { requestOrigin } from "@/lib/request-origin";
import { makeSetPasswordToken, setPasswordPath } from "@/services/auth/set-password-link";
import type { Staff } from "./types";

/**
 * What the link dialog shows (Step 50.5): who the link is for, the full
 * address to send them, and whether it's their first password or a reset.
 */
export type SignInLink = { name: string; url: string; kind: "invite" | "reset" };

/**
 * A set-password link for `staff`, made with their current password
 * fingerprint, so it works once. Server-only, and not a Server Action:
 * the actions that call it (`inviteStaff`, `createSignInLink`,
 * `createSchool`) check who's asking first.
 */
export async function makeSignInLink(staff: Staff): Promise<SignInLink> {
  const found = await staffRepository.getForSession(staff.id);
  const token = makeSetPasswordToken(staff.id, found?.passwordHash ?? null, sessionSecret(), new Date());
  return {
    name: `${staff.firstName} ${staff.lastName}`,
    url: `${await requestOrigin()}${setPasswordPath(token)}`,
    kind: found?.passwordHash ? "reset" : "invite",
  };
}
