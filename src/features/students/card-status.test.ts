import { describe, expect, it } from "vitest";
import { deriveCardStatus } from "./card-status";
import type { Card } from "./types";

function card(overrides: Partial<Card>): Card {
  return {
    id: "card-0001",
    schoolId: "school-balanga",
    studentId: "student-0001",
    serial: "04:A3:5F:2B:91:C0:80",
    status: "active",
    linkedAt: "2026-06-01T08:00:00Z",
    ...overrides,
  };
}

describe("deriveCardStatus", () => {
  it("is 'none' when there's no card on file at all", () => {
    expect(deriveCardStatus([])).toBe("none");
  });

  it("is 'lost' when the only card on file was reported lost", () => {
    expect(deriveCardStatus([card({ status: "lost" })])).toBe("lost");
  });

  it("is 'active' when an active card exists, even alongside an older lost one", () => {
    const cards = [
      card({ id: "card-0001", status: "lost", linkedAt: "2026-01-01T08:00:00Z" }),
      card({ id: "card-0002", status: "active", linkedAt: "2026-06-01T08:00:00Z" }),
    ];
    expect(deriveCardStatus(cards)).toBe("active");
  });

  it("is 'none' for a retired card with no active replacement", () => {
    expect(deriveCardStatus([card({ status: "retired" })])).toBe("none");
  });
});
