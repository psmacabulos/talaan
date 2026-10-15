import { cookies } from "next/headers";
import { parentRepository, type ParentRepository } from "@/data/repositories";
import { sessionSecret } from "./env";
import {
  makeParentSessionCookie,
  PARENT_SESSION_COOKIE,
  readParentSessionCookie,
  SESSION_MAX_AGE_SECONDS,
} from "./session-cookie";

/**
 * Only the parent (Step 53). A parent has no school of their own: each
 * linked child's school is on its `ParentStudentLink`, and every parent page
 * reads from there.
 */
export type ParentSession = {
  parentId: string;
};

export type ParentSessionDeps = { parents: ParentRepository; secret: string; now: Date };

/**
 * What a parent cookie means right now, or null for signed out: no cookie,
 * a wrong stamp (a hand-typed parent id is one), an expired cookie, or a
 * parent account that no longer exists. Kept apart from the Next.js
 * functions below so it can be unit-tested with plain arguments.
 */
export async function resolveParentSession(
  raw: string | undefined,
  deps: ParentSessionDeps,
): Promise<ParentSession | null> {
  const parentId = readParentSessionCookie(raw, deps.secret, deps.now);
  if (!parentId) return null;

  const parent = await deps.parents.getById(parentId);
  return parent ? { parentId: parent.id } : null;
}

/** The signed-in parent, or null. Signed out is a normal state here, not an error. Uses the real clock, never DEMO_NOW. */
export async function getParentSession(): Promise<ParentSession | null> {
  const raw = (await cookies()).get(PARENT_SESSION_COOKIE)?.value;
  return resolveParentSession(raw, { parents: parentRepository, secret: sessionSecret(), now: new Date() });
}

/**
 * Signs this browser in as a parent, after signup or a checked password.
 * Not a Server Action (this file has no "use server"): it takes any parent
 * id, and every export of a "use server" file can be called by anyone with
 * a direct request. The same rule as `startStaffSession` (session.ts).
 */
export async function setParentSession(parentId: string): Promise<void> {
  (await cookies()).set(PARENT_SESSION_COOKIE, makeParentSessionCookie(parentId, sessionSecret(), new Date()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearParentSession(): Promise<void> {
  (await cookies()).delete(PARENT_SESSION_COOKIE);
}
