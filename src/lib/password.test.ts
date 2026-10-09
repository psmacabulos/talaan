import { describe, expect, it } from "vitest";
import { hashPassword, passwordMatches } from "./password";

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
