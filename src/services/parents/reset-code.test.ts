import { describe, expect, it } from "vitest";
import { resetCodeSchema } from "@/features/parents/auth-schemas";
import { hashResetCode, makeResetCode, resetCodeMatches } from "./reset-code";

const SECRET = "test-secret-0123456789-0123456789-abcdef";

describe("reset codes (Step 55.6)", () => {
  it("are always 6 digits, leading zeros kept", () => {
    for (let i = 0; i < 200; i++) expect(makeResetCode()).toMatch(/^\d{6}$/);
  });

  it("are stored as a hash that depends on the secret and the row", () => {
    const hash = hashResetCode("reset-1", "012345", SECRET);
    expect(hash).not.toContain("012345");
    expect(hashResetCode("reset-1", "012345", `${SECRET}-other`)).not.toBe(hash);
    expect(hashResetCode("reset-2", "012345", SECRET)).not.toBe(hash);
  });

  it("match only the code they were made from", () => {
    const hash = hashResetCode("reset-1", "482913", SECRET);
    expect(resetCodeMatches(hash, "reset-1", "482913", SECRET)).toBe(true);
    expect(resetCodeMatches(hash, "reset-1", "482914", SECRET)).toBe(false);
    expect(resetCodeMatches(hash, "reset-2", "482913", SECRET)).toBe(false);
  });

  it("are typed as 6 digits, with spaces around them allowed", () => {
    expect(resetCodeSchema.parse(" 482913 ")).toBe("482913");
    expect(resetCodeSchema.safeParse("48291").success).toBe(false);
    expect(resetCodeSchema.safeParse("48291a").success).toBe(false);
  });
});
