import { cookies } from "next/headers";
import type { Role } from "@/features/staff/types";
import { staffRepository, type StaffRepository } from "@/data/repositories";

export const DEV_SESSION_COOKIE = "talaan-dev-session";

/**
 * Who the app renders as until Step 11's dev switcher UI exists (and
 * whenever its cookie is missing/stale after that) — Balanga's own
 * principal, a sensible default persona for a demo.
 */
const DEFAULT_DEV_STAFF_ID = "staff-principal-school-balanga";

export type Session = {
  userId: string;
  role: Role;
  schoolId: string | null;
};

/**
 * The actual logic, kept separate from the two Next.js-specific functions
 * below so it can be unit-tested directly (with a small fake repository)
 * instead of needing to mock `next/headers`'s cookie store.
 */
export async function resolveSession(
  staffId: string | undefined,
  repository: StaffRepository,
): Promise<Session> {
  const staff =
    (staffId ? await repository.getById(staffId) : null) ??
    (await repository.getById(DEFAULT_DEV_STAFF_ID));

  if (!staff) {
    throw new Error(`Default dev staff "${DEFAULT_DEV_STAFF_ID}" was not found in the seed data.`);
  }

  return { userId: staff.id, role: staff.role, schoolId: staff.schoolId };
}

/** Reads the dev session cookie. Usable in Server Components, Server Actions and Route Handlers. */
export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  const staffId = cookieStore.get(DEV_SESSION_COOKIE)?.value;
  return resolveSession(staffId, staffRepository);
}

/**
 * The guard behind "impossible to enable in production" (CLAUDE.md). Called
 * first inside setDevSession — Server Functions are reachable by a direct
 * POST from anywhere, not just from a button that happens not to render, so
 * the check has to live in the function itself, not just in whatever UI
 * calls it (Step 11).
 */
export function assertDevSessionMutationAllowed(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Dev session switching is disabled in production.");
  }
}

/** What Step 11's role/school switcher will call. Not wired to any UI yet. */
export async function setDevSession(staffId: string): Promise<void> {
  "use server";
  assertDevSessionMutationAllowed();
  const cookieStore = await cookies();
  cookieStore.set(DEV_SESSION_COOKIE, staffId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}
