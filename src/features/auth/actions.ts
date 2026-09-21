"use server";

import { redirect } from "next/navigation";
import { setDevSession } from "@/lib/session-actions";

/**
 * Phase 1's stand-in for real sign-in: reuses the Step 11 dev switcher's
 * own `setDevSession` (and its production guard) instead of duplicating
 * the cookie logic, then sends the browser to the dashboard the way a real
 * sign-in would. Called by both the main form and the demo shortcuts
 * (login-form.tsx, demo-shortcuts.tsx) — only ever reachable when
 * `signInEnabled` is true (`NODE_ENV !== "production"`), so this throwing
 * in production is a backstop, not the primary guard.
 */
export async function signInAsDemo(staffId: string): Promise<void> {
  await setDevSession(staffId);
  redirect("/dashboard");
}
