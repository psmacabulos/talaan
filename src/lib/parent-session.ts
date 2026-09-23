import { cookies } from "next/headers";
import { parentRepository } from "@/data/repositories";

export const PARENT_SESSION_COOKIE = "talaan-parent-session";

export type ParentSession = {
  parentId: string;
  schoolId: string;
};

/**
 * Real sign-in, unlike the staff session (src/lib/session.ts) — no dev-only
 * fallback persona, and no production guard, because this isn't a demo
 * shortcut disabled outside development, it's Step 22's actual feature. A
 * missing or stale cookie (signed out, or the account was removed from the
 * seed data) is a normal "not signed in" state, not an error.
 */
export async function getParentSession(): Promise<ParentSession | null> {
  const cookieStore = await cookies();
  const parentId = cookieStore.get(PARENT_SESSION_COOKIE)?.value;
  if (!parentId) return null;

  const parent = await parentRepository.getById(parentId);
  if (!parent) return null;

  return { parentId: parent.id, schoolId: parent.schoolId };
}
