import { describe, expect, it } from "vitest";
import type { Staff } from "@/features/staff/types";
import { SEED_STAFF_PASSWORD } from "@/data/seed/staff-password";
import { createMockStaffRepository } from "@/data/repositories/staff-repository";
import { TOO_MANY_TRIES_MESSAGE, WRONG_SIGN_IN_MESSAGE } from "@/features/auth/messages";
import { createLoginThrottle } from "./login-throttle";
import { checkStaffSignIn, type StaffSignInDeps } from "./staff-sign-in";

const principal: Staff = {
  id: "staff-principal",
  schoolId: "school-a",
  role: "principal",
  firstName: "Ana",
  lastName: "Reyes",
  email: "ana@school-a.example",
  status: "active",
};

const invited: Staff = { ...principal, id: "staff-invited", email: "new@school-a.example", status: "invited" };

function deps(): StaffSignInDeps {
  return {
    staff: createMockStaffRepository([principal, invited], { latencyMs: 0 }),
    throttle: createLoginThrottle({ maxFailures: 5, windowMs: 15 * 60_000 }),
    now: 0,
  };
}

describe("checkStaffSignIn", () => {
  it("signs in with the right password, whatever the email's case", async () => {
    await expect(
      checkStaffSignIn({ email: "ANA@school-a.example", password: SEED_STAFF_PASSWORD }, deps()),
    ).resolves.toEqual({ ok: true, staffId: principal.id });
  });

  it("gives the same answer for a wrong password, an unknown email and an account with no password", async () => {
    const d = deps();
    const wrong = { ok: false, formError: WRONG_SIGN_IN_MESSAGE };
    await expect(checkStaffSignIn({ email: principal.email, password: "nope" }, d)).resolves.toEqual(wrong);
    await expect(checkStaffSignIn({ email: "who@school-a.example", password: "nope" }, d)).resolves.toEqual(wrong);
    await expect(checkStaffSignIn({ email: invited.email, password: SEED_STAFF_PASSWORD }, d)).resolves.toEqual(wrong);
  });

  it("says 'Too many tries' on the 5th wrong password", async () => {
    const d = deps();
    for (let i = 0; i < 4; i++) await checkStaffSignIn({ email: principal.email, password: "nope" }, d);
    await expect(checkStaffSignIn({ email: principal.email, password: "nope" }, d)).resolves.toEqual({
      ok: false,
      formError: TOO_MANY_TRIES_MESSAGE,
    });
  });

  it("refuses a locked email even with the right password", async () => {
    const d = deps();
    for (let i = 0; i < 5; i++) await checkStaffSignIn({ email: principal.email, password: "nope" }, d);
    await expect(checkStaffSignIn({ email: principal.email, password: SEED_STAFF_PASSWORD }, d)).resolves.toEqual({
      ok: false,
      formError: TOO_MANY_TRIES_MESSAGE,
    });
  });

  it("lets the right password in after 15 minutes", async () => {
    const d = deps();
    for (let i = 0; i < 5; i++) await checkStaffSignIn({ email: principal.email, password: "nope" }, d);
    await expect(
      checkStaffSignIn({ email: principal.email, password: SEED_STAFF_PASSWORD }, { ...d, now: 15 * 60_000 }),
    ).resolves.toEqual({ ok: true, staffId: principal.id });
  });
});
