import { describe, expect, it } from "vitest";
import { cardSerialSchema } from "./schemas";
import { generateCardSerial, isSerialAvailable } from "./card-serial";
import type { Card } from "./types";

describe("generateCardSerial", () => {
  it("always produces a serial the card schema itself accepts", () => {
    for (let i = 0; i < 50; i++) {
      expect(cardSerialSchema.safeParse(generateCardSerial()).success).toBe(true);
    }
  });

  it("starts with the 04 NFC UID prefix, matching the seed data's own cards", () => {
    expect(generateCardSerial().startsWith("04:")).toBe(true);
  });
});

describe("isSerialAvailable", () => {
  const activeCard: Card = {
    id: "card-active",
    schoolId: "school-a",
    studentId: "student-a",
    serial: "04:11:22:33:44:55:66",
    status: "active",
    linkedAt: "2026-06-15T08:00:00Z",
  };

  it("is available when no card has that serial", () => {
    expect(isSerialAvailable("04:AA:BB:CC:DD:EE:FF", [activeCard])).toBe(true);
  });

  it("is not available when an active card already has that serial", () => {
    expect(isSerialAvailable("04:11:22:33:44:55:66", [activeCard])).toBe(false);
  });

  it("is available again once that card is lost or retired", () => {
    const lostCard: Card = { ...activeCard, status: "lost" };
    expect(isSerialAvailable("04:11:22:33:44:55:66", [lostCard])).toBe(true);

    const retiredCard: Card = { ...activeCard, status: "retired" };
    expect(isSerialAvailable("04:11:22:33:44:55:66", [retiredCard])).toBe(true);
  });
});
