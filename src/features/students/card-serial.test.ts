import { describe, expect, it } from "vitest";
import { cardSerialSchema } from "./schemas";
import {
  findSerialConflict,
  firstFourBytes,
  generateCardSerial,
  isSerialAvailable,
  normalizeCardSerial,
} from "./card-serial";
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

describe("normalizeCardSerial", () => {
  it.each([
    // Two of the owner's own stickers, as the USB reader types them.
    ["0211299923", "53:2E:98:0C"],
    ["0213292883", "53:97:B6:0C"],
    // Hex from an NFC app or typed by hand: any case, any separators.
    ["532e980c", "53:2E:98:0C"],
    [" 53 2e 98 0c ", "53:2E:98:0C"],
    ["53-2E-98-0C", "53:2E:98:0C"],
    ["53:2E:98:0C:14:00:01", "53:2E:98:0C:14:00:01"],
    ["532E980C140001", "53:2E:98:0C:14:00:01"],
  ])("turns %j into %s", (raw, serial) => {
    expect(normalizeCardSerial(raw)).toBe(serial);
    expect(cardSerialSchema.safeParse(serial).success).toBe(true);
  });

  it.each([
    "4294967296", // one more than 4 bytes can hold
    "12345", // too short for the reader
    "02112999230", // 11 digits
    "53:2E:98", // 3 bytes
    "53:2E:98:0C:14", // 5 bytes
    "hello",
    "",
  ])("rejects %j", (raw) => {
    expect(normalizeCardSerial(raw)).toBeNull();
  });
});

describe("firstFourBytes", () => {
  it("keeps the first 4 bytes, which is all the USB reader sends", () => {
    expect(firstFourBytes("53:2E:98:0C:14:00:01")).toBe("53:2E:98:0C");
    expect(firstFourBytes("53:2E:98:0C")).toBe("53:2E:98:0C");
  });
});

describe("findSerialConflict", () => {
  function card(serial: string, status: Card["status"]): Card {
    return {
      id: `card-${serial}`,
      schoolId: "school-a",
      studentId: "student-b",
      serial,
      status,
      linkedAt: "2026-06-15T08:00:00Z",
    };
  }

  it("allows a serial nobody has", () => {
    expect(findSerialConflict("53:2E:98:0C", null, [])).toBeNull();
  });

  it("refuses a serial an active card has", () => {
    const existing = card("53:2E:98:0C", "active");
    expect(findSerialConflict("53:2E:98:0C", existing, [existing])).toBe("linked");
  });

  it("refuses a lost or retired card's serial, since each card is one row forever", () => {
    expect(findSerialConflict("53:2E:98:0C", card("53:2E:98:0C", "lost"), [])).toBe("used_before");
    expect(findSerialConflict("53:2E:98:0C", card("53:2E:98:0C", "retired"), [])).toBe("used_before");
  });

  it("refuses a 4-byte serial when an active 7-byte card starts with it, and the other way round", () => {
    expect(findSerialConflict("53:2E:98:0C", null, [card("53:2E:98:0C:14:00:01", "active")])).toBe("same_first_bytes");
    expect(findSerialConflict("53:2E:98:0C:14:00:01", null, [card("53:2E:98:0C", "active")])).toBe("same_first_bytes");
  });

  it("ignores a lost card that only shares the first 4 bytes", () => {
    expect(findSerialConflict("53:2E:98:0C", null, [card("53:2E:98:0C:14:00:01", "lost")])).toBeNull();
  });
});
