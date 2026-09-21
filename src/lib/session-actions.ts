"use server";

import { cookies } from "next/headers";
import { assertDevSessionMutationAllowed, DEV_SESSION_COOKIE } from "./session";

/**
 * The Step 11 dev switcher (src/components/app-shell/dev-switcher.tsx)
 * imports this directly into a Client Component, which Next.js only
 * allows for a Server Function declared in its own file with a top-of-file
 * `"use server"` — see
 * node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md's
 * "Using Server Functions in a Client Component". Kept out of session.ts
 * itself because that file also exports a plain type and a non-async
 * function, and a file-level `"use server"` directive requires every
 * export in the file to be an async function.
 */
export async function setDevSession(staffId: string): Promise<void> {
  assertDevSessionMutationAllowed();
  const cookieStore = await cookies();
  cookieStore.set(DEV_SESSION_COOKIE, staffId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}
