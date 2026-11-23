import { describe, expect, it } from "vitest";
import { activityHref, encodeCursor, parseActivityParams } from "./search-params";

const cursor = { createdAt: "2026-06-19T01:00:00.000Z", id: "7b6d3f0e-1c2a-4d5e-9f10-a1b2c3d4e5f6" };

describe("Activity URL (Step 60.1)", () => {
  it("falls back to everything, newest first", () => {
    expect(parseActivityParams({})).toEqual({ group: "all", before: null });
    expect(parseActivityParams({ group: "nonsense", before: "garbage" })).toEqual({ group: "all", before: null });
  });

  it("reads a group and a cursor", () => {
    expect(parseActivityParams({ group: "cards", before: encodeCursor(cursor) })).toEqual({
      group: "cards",
      before: cursor,
    });
  });

  it("refuses a cursor with a made-up time or id, so it can't reach the query", () => {
    expect(parseActivityParams({ before: "not-a-time_7b6d3f0e-1c2a-4d5e-9f10-a1b2c3d4e5f6" }).before).toBeNull();
    expect(parseActivityParams({ before: `${cursor.createdAt}_'; DROP TABLE x` }).before).toBeNull();
  });

  it("builds an address with only what differs from the default", () => {
    expect(activityHref({ group: "all" })).toBe("/activity");
    expect(activityHref({ group: "staff" })).toBe("/activity?group=staff");
    expect(activityHref({ group: "all", before: cursor })).toBe(
      `/activity?before=${encodeURIComponent(encodeCursor(cursor))}`,
    );
  });
});
