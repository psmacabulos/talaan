import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/features/staff/types";
import {
  schoolRepository,
  staffRepository,
  type SchoolRepository,
  type StaffRepository,
} from "@/data/repositories";
import { sessionSecret } from "./env";
import { passwordVersion } from "./password";
import {
  makeStaffSessionCookie,
  readStaffSessionCookie,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "./session-cookie";

export type Session = {
  userId: string;
  role: Role;
  schoolId: string | null;
};

export type SessionDeps = {
  staff: StaffRepository;
  schools: SchoolRepository;
  secret: string;
  now: Date;
};

/**
 * What a session cookie means right now, or null for signed out: no
 * cookie, a wrong stamp, an expired cookie, a staff member who no longer
 * exists, or a password changed since the cookie was made (`pv`).
 *
 * The school never comes from anything the browser sends except this
 * signed cookie. Everyone but a super admin gets their own school. A super
 * admin gets the school they opened (`school`), if it still exists.
 *
 * Kept apart from the Next.js-specific functions below so it can be
 * unit-tested with plain arguments.
 */
export async function resolveSession(raw: string | undefined, deps: SessionDeps): Promise<Session | null> {
  const cookie = readStaffSessionCookie(raw, deps.secret, deps.now);
  if (!cookie) return null;

  const found = await deps.staff.getForSession(cookie.staffId);
  if (!found || passwordVersion(found.passwordHash) !== cookie.pv) return null;

  const { staff } = found;
  if (staff.role !== "super_admin") {
    return { userId: staff.id, role: staff.role, schoolId: staff.schoolId };
  }
  const viewing = cookie.school ? await deps.schools.getById(cookie.school) : null;
  return { userId: staff.id, role: staff.role, schoolId: viewing?.id ?? null };
}

/**
 * The signed-in staff member, or null when signed out. For Server Actions
 * and anything else that must answer rather than redirect. `cache` runs it
 * once per request, so the layout and the page share one database lookup.
 * Uses the real clock, never DEMO_NOW: a cookie's expiry is about real time.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  return resolveSession(raw, {
    staff: staffRepository,
    schools: schoolRepository,
    secret: sessionSecret(),
    now: new Date(),
  });
});

/** For pages: the session, or straight to the sign-in screen. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/");
  return session;
}

/**
 * Signs a browser in as `staffId` by setting the signed cookie. Only ever
 * called from server code that has already decided this person may sign
 * in: the guarded dev switcher, Open school, and (Step 50.1) the sign-in
 * form after the password checks out.
 *
 * Deliberately not a Server Action (this file has no "use server"): every
 * exported function in a "use server" file can be called by anyone with a
 * direct request, and this one takes any staff id.
 */
export async function startStaffSession(staffId: string, school?: string): Promise<void> {
  const found = await staffRepository.getForSession(staffId);
  if (!found) throw new Error("Can't start a session for a staff member who doesn't exist.");

  const value = makeStaffSessionCookie(
    { staffId, pv: passwordVersion(found.passwordHash), school },
    sessionSecret(),
    new Date(),
  );
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * The guard behind "impossible to enable in production" (CLAUDE.md). Called
 * first inside setDevSession (src/lib/session-actions.ts) — Server
 * Functions are reachable by a direct POST from anywhere, not just from a
 * button that happens not to render, so the check has to live in the
 * function itself, not just in whatever UI calls it (Step 11).
 */
export function assertDevSessionMutationAllowed(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Dev session switching is disabled in production.");
  }
}
