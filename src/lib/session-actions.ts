"use server";

import { assertDevSessionMutationAllowed, startStaffSession } from "./session";

/**
 * The Step 11 dev switcher and the login screen's demo shortcuts: sign in
 * as any staff member with no password. Sets the same signed cookie a real
 * sign-in does (Step 50), and throws in production, where the only way in
 * is the sign-in form.
 *
 * The dev switcher (src/components/app-shell/dev-switcher.tsx) imports
 * this directly into a Client Component, which Next.js only allows for a
 * Server Function declared in its own file with a top-of-file
 * `"use server"` — see
 * node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md's
 * "Using Server Functions in a Client Component".
 */
export async function setDevSession(staffId: string): Promise<void> {
  assertDevSessionMutationAllowed();
  await startStaffSession(staffId);
}
