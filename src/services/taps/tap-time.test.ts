import { describe, expect, it } from "vitest";
import { chooseTapTime } from "./tap-time";

const RECEIVED = "2026-06-19T00:00:00.000Z";
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function offset(ms: number): string {
  return new Date(Date.parse(RECEIVED) + ms).toISOString();
}

describe("chooseTapTime", () => {
  it("keeps the gate's own time, so a queued tap keeps when it happened", () => {
    expect(chooseTapTime(offset(-30 * MINUTE), RECEIVED)).toBe(offset(-30 * MINUTE));
  });

  it("keeps a time exactly 5 minutes ahead or 7 days behind", () => {
    expect(chooseTapTime(offset(5 * MINUTE), RECEIVED)).toBe(offset(5 * MINUTE));
    expect(chooseTapTime(offset(-7 * DAY), RECEIVED)).toBe(offset(-7 * DAY));
  });

  it("uses the server's time when the gate's clock is too far ahead or behind", () => {
    expect(chooseTapTime(offset(6 * MINUTE), RECEIVED)).toBe(RECEIVED);
    expect(chooseTapTime(offset(-8 * DAY), RECEIVED)).toBe(RECEIVED);
  });

  it("uses the server's time when the gate's time isn't a time", () => {
    expect(chooseTapTime("not a time", RECEIVED)).toBe(RECEIVED);
  });

  it("returns the same instant written the standard way", () => {
    expect(chooseTapTime("2026-06-19T07:56:00+08:00", RECEIVED)).toBe("2026-06-18T23:56:00.000Z");
  });
});
