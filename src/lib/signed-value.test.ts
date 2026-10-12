import { describe, expect, it } from "vitest";
import { readSignedValue, signValue, type SignedPayload } from "./signed-value";

const SECRET = "test-secret-0123456789-0123456789-abcdef";
const NOW = new Date("2026-10-12T08:00:00Z");
const IN_AN_HOUR = Math.floor(NOW.getTime() / 1000) + 60 * 60;

describe("signValue / readSignedValue", () => {
  it("reads back what was signed", () => {
    const signed = signValue({ staffId: "staff-1", exp: IN_AN_HOUR }, "staff-session", SECRET);
    expect(readSignedValue(signed, "staff-session", SECRET, NOW)).toEqual({ staffId: "staff-1", exp: IN_AN_HOUR });
  });

  it("refuses a value with one character changed, in the payload or the stamp", () => {
    const signed = signValue({ staffId: "staff-1", exp: IN_AN_HOUR }, "staff-session", SECRET);
    const dot = signed.lastIndexOf(".");
    for (const index of [0, dot - 1, dot + 1, signed.length - 1]) {
      const changed = signed.slice(0, index) + (signed[index] === "A" ? "B" : "A") + signed.slice(index + 1);
      expect(readSignedValue(changed, "staff-session", SECRET, NOW)).toBeNull();
    }
  });

  it("refuses a payload swapped for another, keeping the old stamp", () => {
    const signed = signValue({ staffId: "staff-1", exp: IN_AN_HOUR }, "staff-session", SECRET);
    const forgedBody = Buffer.from(JSON.stringify({ staffId: "staff-super", exp: IN_AN_HOUR })).toString("base64url");
    const forged = `${forgedBody}.${signed.split(".")[1]}`;
    expect(readSignedValue(forged, "staff-session", SECRET, NOW)).toBeNull();
  });

  it("refuses a value made for another purpose", () => {
    const signed = signValue({ parentId: "parent-1", exp: IN_AN_HOUR }, "parent-session", SECRET);
    expect(readSignedValue(signed, "staff-session", SECRET, NOW)).toBeNull();
  });

  it("refuses a value made with another secret", () => {
    const signed = signValue({ staffId: "staff-1", exp: IN_AN_HOUR }, "staff-session", `${SECRET}-other`);
    expect(readSignedValue(signed, "staff-session", SECRET, NOW)).toBeNull();
  });

  it("refuses an expired value, even with the right stamp", () => {
    const signed = signValue({ staffId: "staff-1", exp: IN_AN_HOUR }, "staff-session", SECRET);
    const later = new Date((IN_AN_HOUR + 1) * 1000);
    expect(readSignedValue(signed, "staff-session", SECRET, later)).toBeNull();
  });

  it("refuses a correctly stamped payload with no expiry", () => {
    // signValue's type insists on exp, so this goes around it on purpose.
    const noExpiry = { staffId: "staff-1" } as unknown as SignedPayload;
    const signed = signValue(noExpiry, "staff-session", SECRET);
    expect(readSignedValue(signed, "staff-session", SECRET, NOW)).toBeNull();
  });

  it("gives null for garbage, never an exception", () => {
    for (const raw of [undefined, "", ".", "abc", "abc.", ".abc", "not base64!.###", "a.b.c"]) {
      expect(readSignedValue(raw, "staff-session", SECRET, NOW)).toBeNull();
    }
  });
});
