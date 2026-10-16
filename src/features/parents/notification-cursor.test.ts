import { describe, expect, it } from "vitest";
import { decodeNotificationCursor, encodeNotificationCursor, newestNotificationFirst } from "./notification-cursor";

const UUID = "3f2a9c1e-0b7d-4e8a-9c3f-1a2b3c4d5e6f";
const AT = "2026-06-20T07:56:00.000Z";

function encodeRaw(text: string): string {
  return Buffer.from(text).toString("base64url");
}

describe("notification cursor", () => {
  it("decodes what it encodes, for a UUID and for a seed id", () => {
    expect(decodeNotificationCursor(encodeNotificationCursor({ tappedAt: AT, id: UUID }))).toEqual({
      tappedAt: AT,
      id: UUID,
    });
    expect(decodeNotificationCursor(encodeNotificationCursor({ tappedAt: AT, id: "notification-0001" }))).toEqual({
      tappedAt: AT,
      id: "notification-0001",
    });
  });

  it("refuses to make a cursor that couldn't be read back", () => {
    expect(() => encodeNotificationCursor({ tappedAt: AT, id: "a-bc" })).toThrow();
  });

  it("is only address-safe characters", () => {
    expect(encodeNotificationCursor({ tappedAt: AT, id: UUID })).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["not base64 of anything useful", "!!!"],
    ["no id", encodeRaw(AT)],
    ["a bad time", encodeRaw(`yesterday|${UUID}`)],
    ["an extra part", encodeRaw(`${AT}|${UUID}|more`)],
    ["an upper-case id", encodeRaw(`${AT}|${UUID.toUpperCase()}`)],
    // Postgres and JavaScript could order this one differently from a UUID.
    ["an id of another shape", encodeRaw(`${AT}|a-bc`)],
  ])("means the first page when it's %s", (_, raw) => {
    expect(decodeNotificationCursor(raw)).toBeNull();
  });
});

describe("newestNotificationFirst", () => {
  it("puts the newest first, and the larger id first on a tie", () => {
    const rows = [
      { tappedAt: "2026-06-20T07:00:00.000Z", id: "a0000000-0000-4000-8000-000000000000" },
      { tappedAt: "2026-06-20T08:00:00.000Z", id: "10000000-0000-4000-8000-000000000000" },
      { tappedAt: "2026-06-20T07:00:00.000Z", id: "notification-0001" },
    ];
    expect([...rows].sort(newestNotificationFirst).map((row) => row.id)).toEqual([
      "10000000-0000-4000-8000-000000000000",
      "notification-0001",
      "a0000000-0000-4000-8000-000000000000",
    ]);
  });
});
