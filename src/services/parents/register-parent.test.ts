import { describe, expect, it } from "vitest";
import { createMockParentRepository, type ParentRepository } from "@/data/repositories/parent-repository";
import { TOO_MANY_TRIES_MESSAGE } from "@/features/auth/messages";
import { createLoginThrottle } from "@/services/auth/login-throttle";
import type { Parent } from "@/features/parents/types";
import { EMAIL_TAKEN_MESSAGE, registerParent, type RegisterParentDeps } from "./register-parent";

function deps(
  parents: RegisterParentDeps["parents"],
  address: string | null = "203.0.113.7",
  signUpThrottle = createLoginThrottle({ maxFailures: 100, windowMs: 60 * 60_000 }),
): RegisterParentDeps {
  return { parents, signUpThrottle, address, now: 0 };
}

const maria: Parent = {
  id: "parent-maria",
  firstName: "Maria",
  lastName: "Dela Cruz",
  mobile: "09171234567",
  email: "maria@example.com",
};

const signup = {
  firstName: "Ana",
  lastName: "Reyes",
  mobile: "09171112222",
  email: " Ana@Example.com ",
  password: "testpass123",
  confirmPassword: "testpass123",
};

describe("registerParent", () => {
  it("creates the account with its email trimmed and in lower case", async () => {
    const parents = createMockParentRepository([], { latencyMs: 0 });
    const result = await registerParent(signup, deps(parents));
    expect(result).toMatchObject({ ok: true, parent: { firstName: "Ana", email: "ana@example.com" } });
    await expect(parents.verifyPassword("ana@example.com", "testpass123")).resolves.not.toBeNull();
  });

  it("returns each field's first message for bad input, and creates nothing", async () => {
    const parents = createMockParentRepository([], { latencyMs: 0 });
    const result = await registerParent({ ...signup, email: "not-an-email", confirmPassword: "other" }, deps(parents));
    expect(result).toEqual({
      ok: false,
      code: "invalid_input",
      fieldErrors: { email: "Enter a valid email address", confirmPassword: "Passwords don't match" },
    });
    await expect(parents.findByEmail("ana@example.com")).resolves.toBeNull();
  });

  it("refuses an email that's taken, whatever its case", async () => {
    const parents = createMockParentRepository([{ ...maria }], { latencyMs: 0 });
    const result = await registerParent({ ...signup, email: "MARIA@example.com" }, deps(parents));
    expect(result).toEqual({ ok: false, code: "email_taken", fieldErrors: { email: EMAIL_TAKEN_MESSAGE } });
  });

  it("gives the same answer when another sign-up saved the email a moment earlier", async () => {
    // Both sign-ups passed the "is it free?" check; the repository keeps only one.
    const lostTheRace: Pick<ParentRepository, "findByEmail" | "create"> = {
      findByEmail: async () => null,
      create: async () => null,
    };
    await expect(registerParent(signup, deps(lostTheRace))).resolves.toEqual({
      ok: false,
      code: "email_taken",
      fieldErrors: { email: EMAIL_TAKEN_MESSAGE },
    });
  });

  it("stops sign-ups from one address at the limit, before any password is hashed", async () => {
    const parents = createMockParentRepository([], { latencyMs: 0 });
    const throttle = createLoginThrottle({ maxFailures: 2, windowMs: 60 * 60_000 });
    const one = (n: number) =>
      registerParent({ ...signup, email: `p${n}@example.com` }, deps(parents, "203.0.113.7", throttle));
    await one(1);
    await one(2); // the 2nd locks the address
    await expect(one(3)).resolves.toEqual({ ok: false, code: "too_many_tries", formError: TOO_MANY_TRIES_MESSAGE });
    await expect(parents.findByEmail("p3@example.com")).resolves.toBeNull();
    // Another address isn't affected.
    await expect(
      registerParent({ ...signup, email: "p4@example.com" }, deps(parents, "198.51.100.1", throttle)),
    ).resolves.toMatchObject({ ok: true });
  });

  it("doesn't count a form with typos, and doesn't limit this computer's own requests", async () => {
    const parents = createMockParentRepository([], { latencyMs: 0 });
    const throttle = createLoginThrottle({ maxFailures: 1, windowMs: 60 * 60_000 });
    await registerParent({ ...signup, email: "typo" }, deps(parents, "203.0.113.7", throttle));
    await expect(registerParent(signup, deps(parents, "203.0.113.7", throttle))).resolves.toMatchObject({ ok: true });
    for (let n = 0; n < 3; n++) {
      await expect(
        registerParent({ ...signup, email: `local${n}@example.com` }, deps(parents, null, throttle)),
      ).resolves.toMatchObject({ ok: true });
    }
  });
});
