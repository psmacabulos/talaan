import { describe, expect, it } from "vitest";
import { createLoginThrottle, parentThrottleKey, staffThrottleKey } from "./login-throttle";

const MINUTE = 60_000;

function throttle() {
  return createLoginThrottle({ maxFailures: 5, windowMs: 15 * MINUTE });
}

describe("createLoginThrottle", () => {
  it("doesn't lock after 4 wrong passwords", () => {
    const t = throttle();
    for (let i = 0; i < 4; i++) expect(t.recordFailure("a", i)).toBe(false);
    expect(t.isLocked("a", 5)).toBe(false);
  });

  it("locks on the 5th wrong password", () => {
    const t = throttle();
    for (let i = 0; i < 4; i++) t.recordFailure("a", i);
    expect(t.recordFailure("a", 4)).toBe(true);
    expect(t.isLocked("a", 5)).toBe(true);
  });

  it("lifts the lock 15 minutes after it started", () => {
    const t = throttle();
    for (let i = 0; i < 5; i++) t.recordFailure("a", 0);
    expect(t.isLocked("a", 15 * MINUTE - 1)).toBe(true);
    expect(t.isLocked("a", 15 * MINUTE)).toBe(false);
    // A fresh start: one more wrong password doesn't lock again.
    expect(t.recordFailure("a", 15 * MINUTE)).toBe(false);
  });

  it("forgets wrong passwords older than 15 minutes", () => {
    const t = throttle();
    for (let i = 0; i < 4; i++) t.recordFailure("a", 0);
    expect(t.recordFailure("a", 15 * MINUTE)).toBe(false);
  });

  it("clears the count after a right password", () => {
    const t = throttle();
    for (let i = 0; i < 4; i++) t.recordFailure("a", i);
    t.recordSuccess("a");
    expect(t.recordFailure("a", 5)).toBe(false);
  });

  it("counts each key separately", () => {
    const t = throttle();
    for (let i = 0; i < 5; i++) t.recordFailure("a", i);
    expect(t.isLocked("a", 5)).toBe(true);
    expect(t.isLocked("b", 5)).toBe(false);
  });
});

describe("throttle keys", () => {
  it("ignore case and spaces, and keep staff and parents apart", () => {
    expect(staffThrottleKey(" Ana@School.example ")).toBe(staffThrottleKey("ana@school.example"));
    expect(staffThrottleKey("ana@school.example")).not.toBe(parentThrottleKey("ana@school.example"));
  });
});
