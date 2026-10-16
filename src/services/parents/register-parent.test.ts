import { describe, expect, it } from "vitest";
import { createMockParentRepository, type ParentRepository } from "@/data/repositories/parent-repository";
import type { Parent } from "@/features/parents/types";
import { EMAIL_TAKEN_MESSAGE, registerParent } from "./register-parent";

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
    const result = await registerParent(signup, { parents });
    expect(result).toMatchObject({ ok: true, parent: { firstName: "Ana", email: "ana@example.com" } });
    await expect(parents.verifyPassword("ana@example.com", "testpass123")).resolves.not.toBeNull();
  });

  it("returns each field's first message for bad input, and creates nothing", async () => {
    const parents = createMockParentRepository([], { latencyMs: 0 });
    const result = await registerParent({ ...signup, email: "not-an-email", confirmPassword: "other" }, { parents });
    expect(result).toEqual({
      ok: false,
      code: "invalid_input",
      fieldErrors: { email: "Enter a valid email address", confirmPassword: "Passwords don't match" },
    });
    await expect(parents.findByEmail("ana@example.com")).resolves.toBeNull();
  });

  it("refuses an email that's taken, whatever its case", async () => {
    const parents = createMockParentRepository([{ ...maria }], { latencyMs: 0 });
    const result = await registerParent({ ...signup, email: "MARIA@example.com" }, { parents });
    expect(result).toEqual({ ok: false, code: "email_taken", fieldErrors: { email: EMAIL_TAKEN_MESSAGE } });
  });

  it("gives the same answer when another sign-up saved the email a moment earlier", async () => {
    // Both sign-ups passed the "is it free?" check; the repository keeps only one.
    const lostTheRace: Pick<ParentRepository, "findByEmail" | "create"> = {
      findByEmail: async () => null,
      create: async () => null,
    };
    await expect(registerParent(signup, { parents: lostTheRace })).resolves.toEqual({
      ok: false,
      code: "email_taken",
      fieldErrors: { email: EMAIL_TAKEN_MESSAGE },
    });
  });
});
