import { describe, expect, it } from "vitest";
import { gateTapRequestSchema } from "./schemas";

const valid = {
  clientTapId: "6f1c2b7e-3a4d-4e5f-8a9b-0c1d2e3f4a5b",
  cardSerial: "0211299923",
  clientTappedAt: "2026-06-19T07:56:00+08:00",
};

describe("gateTapRequestSchema", () => {
  it("accepts a tap from the gate, with a Z or +08:00 time", () => {
    expect(gateTapRequestSchema.safeParse(valid).success).toBe(true);
    expect(gateTapRequestSchema.safeParse({ ...valid, clientTappedAt: "2026-06-18T23:56:00.000Z" }).success).toBe(true);
  });

  it.each([
    ["a missing id", { ...valid, clientTapId: undefined }],
    ["an id that isn't a UUID", { ...valid, clientTapId: "tap-1" }],
    ["a time with no offset", { ...valid, clientTappedAt: "2026-06-19T07:56:00" }],
    ["an empty serial", { ...valid, cardSerial: "" }],
    ["a 65-character serial", { ...valid, cardSerial: "0".repeat(65) }],
  ])("rejects %s", (_label, body) => {
    expect(gateTapRequestSchema.safeParse(body).success).toBe(false);
  });
});
