import { describe, expect, it } from "vitest";
import { connectionStatus, lastSeenLabel, ONLINE_WITHIN_MS } from "./connection";

const NOW = "2026-06-19T01:15:00.000Z";
const before = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();

describe("connectionStatus (Step 59.12)", () => {
  it("is never connected until the device is first seen", () => {
    expect(connectionStatus(null, NOW)).toBe("never");
  });

  it("is online up to exactly 12 minutes, offline after", () => {
    expect(connectionStatus(before(0), NOW)).toBe("online");
    expect(connectionStatus(before(ONLINE_WITHIN_MS), NOW)).toBe("online");
    expect(connectionStatus(before(ONLINE_WITHIN_MS + 1), NOW)).toBe("offline");
  });

  it("counts a time ahead of the clock as online", () => {
    expect(connectionStatus(before(-60_000), NOW)).toBe("online");
  });
});

describe("lastSeenLabel (Step 59.12)", () => {
  it("is null when never seen", () => {
    expect(lastSeenLabel(null, NOW)).toBeNull();
  });

  it("says how long ago, in the largest whole unit", () => {
    expect(lastSeenLabel(before(30_000), NOW)).toBe("Just now");
    expect(lastSeenLabel(before(60_000), NOW)).toBe("1 minute ago");
    expect(lastSeenLabel(before(2 * 60_000), NOW)).toBe("2 minutes ago");
    expect(lastSeenLabel(before(3 * 60 * 60_000), NOW)).toBe("3 hours ago");
    expect(lastSeenLabel(before(24 * 60 * 60_000), NOW)).toBe("1 day ago");
  });

  it("says just now for a time ahead of the clock", () => {
    expect(lastSeenLabel(before(-60_000), NOW)).toBe("Just now");
  });
});
