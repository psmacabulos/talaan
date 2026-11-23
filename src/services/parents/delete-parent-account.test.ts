import { describe, expect, it, vi } from "vitest";
import { createMockParentRepository, SEED_PARENT_PASSWORD } from "@/data/repositories/parent-repository";
import type { Parent } from "@/features/parents/types";
import { createLoginThrottle } from "@/services/auth/login-throttle";
import {
  ACCOUNT_GONE_MESSAGE,
  deleteParentAccount,
  ENTER_PASSWORD_MESSAGE,
  WRONG_PASSWORD_MESSAGE,
  type DeleteParentAccountDeps,
} from "./delete-parent-account";

const maria: Parent = {
  id: "parent-maria",
  firstName: "Maria",
  lastName: "Dela Cruz",
  mobile: "09171234567",
  email: "maria@example.com",
};
const ana: Parent = { ...maria, id: "parent-ana", firstName: "Ana", email: "ana@example.com" };

function deps() {
  const parents = createMockParentRepository([{ ...maria }, { ...ana }], { latencyMs: 0 });
  const result: DeleteParentAccountDeps = {
    parents,
    throttle: createLoginThrottle({ maxFailures: 5, windowMs: 15 * 60_000 }),
    addressThrottle: createLoginThrottle({ maxFailures: 30, windowMs: 15 * 60_000 }),
    address: "203.0.113.7",
    now: 0,
  };
  return { deps: result, parents };
}

describe("deleteParentAccount (Step 60.2)", () => {
  it("deletes the account when the password is right, and only that one", async () => {
    const { deps: d, parents } = deps();

    await expect(deleteParentAccount(maria.id, SEED_PARENT_PASSWORD, d)).resolves.toEqual({ ok: true });

    await expect(parents.getById(maria.id)).resolves.toBeNull();
    await expect(parents.getById(ana.id)).resolves.toEqual(ana);
  });

  it("refuses a wrong password and deletes nothing", async () => {
    const { deps: d, parents } = deps();

    await expect(deleteParentAccount(maria.id, "nope", d)).resolves.toEqual({
      ok: false,
      code: "wrong_password",
      formError: WRONG_PASSWORD_MESSAGE,
    });
    await expect(parents.getById(maria.id)).resolves.toEqual(maria);
  });

  it("asks for a password when none, or an absurdly long one, was sent", async () => {
    const { deps: d } = deps();
    const asked = { ok: false, code: "invalid_input", formError: ENTER_PASSWORD_MESSAGE };

    await expect(deleteParentAccount(maria.id, "", d)).resolves.toEqual(asked);
    await expect(deleteParentAccount(maria.id, undefined, d)).resolves.toEqual(asked);
    await expect(deleteParentAccount(maria.id, "x".repeat(200), d)).resolves.toEqual(asked);
  });

  it("locks after too many wrong passwords, even for the right one afterwards", async () => {
    const { deps: d, parents } = deps();
    for (let i = 0; i < 5; i += 1) await deleteParentAccount(maria.id, "nope", d);

    const locked = await deleteParentAccount(maria.id, SEED_PARENT_PASSWORD, d);

    expect(locked).toMatchObject({ ok: false, code: "too_many_tries" });
    await expect(parents.getById(maria.id)).resolves.toEqual(maria);
  });

  it("answers unauthorized for an account that is already gone, without hashing anything", async () => {
    const { deps: d } = deps();
    const verify = vi.spyOn(d.parents, "verifyPassword");

    await expect(deleteParentAccount("parent-nobody", SEED_PARENT_PASSWORD, d)).resolves.toEqual({
      ok: false,
      code: "unauthorized",
      formError: ACCOUNT_GONE_MESSAGE,
    });
    expect(verify).not.toHaveBeenCalled();
  });

  it("answers gone for a double submit: the second finds nothing to delete", async () => {
    const { deps: d } = deps();
    await deleteParentAccount(maria.id, SEED_PARENT_PASSWORD, d);

    await expect(deleteParentAccount(maria.id, SEED_PARENT_PASSWORD, d)).resolves.toMatchObject({
      ok: false,
      code: "unauthorized",
    });
  });

  it("never checks the password against another account", async () => {
    const { deps: d, parents } = deps();
    // Ana's password is the same demo one, so a request that named her account would pass: it must be Maria's email that is checked.
    const verify = vi.spyOn(parents, "verifyPassword");

    await deleteParentAccount(maria.id, SEED_PARENT_PASSWORD, d);

    expect(verify).toHaveBeenCalledWith(maria.email, SEED_PARENT_PASSWORD);
    await expect(parents.getById(ana.id)).resolves.toEqual(ana);
  });

  it("refuses when the password's account is not the one being deleted", async () => {
    const { deps: d, parents } = deps();
    // Something swapped the account behind the email: verification answers a different parent.
    vi.spyOn(parents, "verifyPassword").mockResolvedValue(ana);

    await expect(deleteParentAccount(maria.id, SEED_PARENT_PASSWORD, d)).resolves.toMatchObject({
      ok: false,
      code: "unauthorized",
    });
    await expect(parents.getById(maria.id)).resolves.toEqual(maria);
  });
});
