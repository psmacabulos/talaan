import { describe, expect, it } from "vitest";
import { SEED_STAFF_PASSWORD, SEED_STAFF_PASSWORD_HASH } from "@/data/seed/staff-password";
import { hashPassword, passwordMatches, passwordVersion } from "./password";

describe("hashPassword / passwordMatches", () => {
  it("accepts the right password and rejects a wrong one", async () => {
    const stored = await hashPassword("Talaan123!");
    await expect(passwordMatches("Talaan123!", stored)).resolves.toBe(true);
    await expect(passwordMatches("talaan123!", stored)).resolves.toBe(false);
  });

  it("never stores the password itself, and salts every hash", async () => {
    const first = await hashPassword("Talaan123!");
    const second = await hashPassword("Talaan123!");
    expect(first).not.toContain("Talaan123!");
    expect(first).not.toBe(second);
  });

  it("rejects a stored value it doesn't recognise", async () => {
    await expect(passwordMatches("Talaan123!", "Talaan123!")).resolves.toBe(false);
  });
});

describe("passwordVersion", () => {
  it("changes when the stored hash changes, and stays the same otherwise", async () => {
    const first = await hashPassword("Talaan123!");
    const second = await hashPassword("Talaan123!");
    expect(passwordVersion(first)).toBe(passwordVersion(first));
    expect(passwordVersion(first)).not.toBe(passwordVersion(second));
  });

  it("is 'none' for an account with no password yet", () => {
    expect(passwordVersion(null)).toBe("none");
  });

  it("doesn't contain the hash itself", async () => {
    const stored = await hashPassword("Talaan123!");
    expect(stored).not.toContain(passwordVersion(stored));
  });
});

describe("SEED_STAFF_PASSWORD_HASH", () => {
  it("is still the hash of SEED_STAFF_PASSWORD", async () => {
    await expect(passwordMatches(SEED_STAFF_PASSWORD, SEED_STAFF_PASSWORD_HASH)).resolves.toBe(true);
  });
});
