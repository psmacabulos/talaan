"use server";

import { redirect } from "next/navigation";
import { setDevSession } from "@/lib/session-actions";

/**
 * Development only: signs in as a demo account with no password, through
 * the Step 11 dev switcher's own `setDevSession` (and its production
 * guard), which sets the same signed cookie a real sign-in will (Step 50).
 * Called by the form and the demo shortcuts (login-form.tsx,
 * demo-shortcuts.tsx) only when `signInEnabled` is true; Step 50.1 makes
 * the form check the real password instead.
 */
export async function signInAsDemo(staffId: string): Promise<void> {
  await setDevSession(staffId);
  redirect("/dashboard");
}
