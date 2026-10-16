import { describe, expect, it } from "vitest";
import { createMockParentRepository, SEED_PARENT_PASSWORD } from "@/data/repositories/parent-repository";
import { TOO_MANY_TRIES_MESSAGE, WRONG_SIGN_IN_MESSAGE } from "@/features/auth/messages";
import type { Parent } from "@/features/parents/types";
import { createLoginThrottle } from "@/services/auth/login-throttle";
import { checkParentSignIn, INVALID_SIGN_IN_INPUT_MESSAGE, type ParentSignInDeps } from "./check-parent-sign-in";

const maria: Parent = {
  id: "parent-maria",
  firstName: "Maria",
  lastName: "Dela Cruz",
  mobile: "09171234567",
  email: "maria@example.com",
};

function deps(): ParentSignInDeps {
  return {
    parents: createMockParentRepository([{ ...maria }], { latencyMs: 0 }),
    throttle: createLoginThrottle({ maxFailures: 5, windowMs: 15 * 60_000 }),
    addressThrottle: createLoginThrottle({ maxFailures: 30, windowMs: 15 * 60_000 }),
    address: "203.0.113.7",
    now: 0,
  };
}

const wrong = { ok: false, code: "wrong_credentials", formError: WRONG_SIGN_IN_MESSAGE };
const tooMany = { ok: false, code: "too_many_tries", formError: TOO_MANY_TRIES_MESSAGE };

describe("checkParentSignIn", () => {
  it("signs in with the right password, whatever the email's case and spaces", async () => {
    await expect(
      checkParentSignIn({ email: " MARIA@example.com ", password: SEED_PARENT_PASSWORD }, deps()),
    ).resolves.toEqual({ ok: true, parent: maria });
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const d = deps();
    await expect(checkParentSignIn({ email: maria.email, password: "nope" }, d)).resolves.toEqual(wrong);
    await expect(checkParentSignIn({ email: "who@example.com", password: "nope" }, d)).resolves.toEqual(wrong);
  });

  it("refuses input that isn't an email and a password, without counting a try", async () => {
    const d = deps();
    await expect(checkParentSignIn({ email: "maria", password: "" }, d)).resolves.toEqual({
      ok: false,
      code: "invalid_input",
      formError: INVALID_SIGN_IN_INPUT_MESSAGE,
    });
    for (let i = 0; i < 4; i++) await checkParentSignIn({ email: maria.email, password: "nope" }, d);
    await expect(checkParentSignIn({ email: maria.email, password: SEED_PARENT_PASSWORD }, d)).resolves.toMatchObject({
      ok: true,
    });
  });

  it("says 'Too many tries' on the 5th wrong password, and then refuses the right one", async () => {
    const d = deps();
    for (let i = 0; i < 4; i++) await checkParentSignIn({ email: maria.email, password: "nope" }, d);
    await expect(checkParentSignIn({ email: maria.email, password: "nope" }, d)).resolves.toEqual(tooMany);
    await expect(checkParentSignIn({ email: maria.email, password: SEED_PARENT_PASSWORD }, d)).resolves.toEqual(
      tooMany,
    );
  });

  it("counts an email in any case as one email", async () => {
    const d = deps();
    for (let i = 0; i < 4; i++) await checkParentSignIn({ email: "MARIA@example.com", password: "nope" }, d);
    await expect(checkParentSignIn({ email: maria.email, password: "nope" }, d)).resolves.toEqual(tooMany);
  });

  it("locks an address after 30 wrong passwords, whatever the emails, even for the right password", async () => {
    const d = deps();
    for (let i = 0; i < 29; i++) await checkParentSignIn({ email: `guess${i}@example.com`, password: "nope" }, d);
    await expect(checkParentSignIn({ email: "guess29@example.com", password: "nope" }, d)).resolves.toEqual(tooMany);
    await expect(checkParentSignIn({ email: maria.email, password: SEED_PARENT_PASSWORD }, d)).resolves.toEqual(
      tooMany,
    );
    // The same parent from another address is fine.
    await expect(
      checkParentSignIn({ email: maria.email, password: SEED_PARENT_PASSWORD }, { ...d, address: "198.51.100.1" }),
    ).resolves.toMatchObject({ ok: true });
  });

  it("doesn't limit this computer's own requests by address", async () => {
    const d = { ...deps(), address: null };
    for (let i = 0; i < 40; i++) await checkParentSignIn({ email: `guess${i}@example.com`, password: "nope" }, d);
    await expect(checkParentSignIn({ email: maria.email, password: SEED_PARENT_PASSWORD }, d)).resolves.toMatchObject({
      ok: true,
    });
  });
});
