"use server";

import { cookies } from "next/headers";
import { PARENT_SESSION_COOKIE } from "./parent-session";

/**
 * Split into its own `"use server"` file for the same reason as
 * `setDevSession` (src/lib/session-actions.ts): a file-level `"use server"`
 * directive requires every export to be an async function, and
 * parent-session.ts also exports a plain type.
 */
export async function setParentSession(parentId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PARENT_SESSION_COOKIE, parentId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearParentSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PARENT_SESSION_COOKIE);
}
