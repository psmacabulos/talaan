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

describe("createLoginThrottle's memory (Step 53.3)", () => {
  it("makes room for a new key by dropping the oldest one that isn't locked", () => {
    const t = createLoginThrottle({ maxFailures: 2, windowMs: 60_000, maxKeys: 2 });
    t.recordFailure("a", 0);
    t.recordFailure("b", 0);
    t.recordFailure("c", 0); // full: "a", the oldest, is dropped
    // "b" still has its first failure, so its second locks it.
    expect(t.recordFailure("b", 1)).toBe(true);
    // "a" starts again from nothing, so its next failure is only its first.
    expect(t.recordFailure("a", 2)).toBe(false);
  });

  it("never drops a live lockout to make room", () => {
    const t = createLoginThrottle({ maxFailures: 1, windowMs: 60_000, maxKeys: 2 });
    t.recordFailure("locked-1", 0);
    t.recordFailure("locked-2", 0);
    expect(t.recordFailure("new", 1)).toBe(false); // not counted: no room
    expect(t.isLocked("locked-1", 2)).toBe(true);
    expect(t.isLocked("locked-2", 2)).toBe(true);
  });
});

describe("throttle keys", () => {
  it("ignore case and spaces, and keep staff and parents apart", () => {
    expect(staffThrottleKey(" Ana@School.example ")).toBe(staffThrottleKey("ana@school.example"));
    expect(staffThrottleKey("ana@school.example")).not.toBe(parentThrottleKey("ana@school.example"));
  });
});
