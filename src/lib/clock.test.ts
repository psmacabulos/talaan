import { afterEach, describe, expect, it, vi } from "vitest";
import { getNow, isDemoClock } from "./clock";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("getNow", () => {
  it("is the real time when DEMO_NOW isn't set", () => {
    vi.stubEnv("DEMO_NOW", "");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-11T01:30:00Z"));
    expect(getNow()).toBe("2026-10-11T01:30:00.000Z");
    expect(isDemoClock()).toBe(false);
  });

  it("is the pinned instant when DEMO_NOW is set, offset and all", () => {
    vi.stubEnv("DEMO_NOW", "2026-06-19T09:15:00+08:00");
    expect(getNow()).toBe("2026-06-19T01:15:00.000Z");
    expect(isDemoClock()).toBe(true);
  });

  it("explains a DEMO_NOW it can't read", () => {
    vi.stubEnv("DEMO_NOW", "tomorrow morning");
    expect(() => getNow()).toThrow(/DEMO_NOW isn't a date and time/);
  });
});
