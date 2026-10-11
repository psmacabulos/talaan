import { describe, expect, it } from "vitest";
import type { Card } from "@/features/students/types";
import { matchCard } from "./match-card";

function card(serial: string, status: Card["status"] = "active", studentId = "student-a"): Card {
  return { id: `card-${serial}`, schoolId: "school-a", studentId, serial, status, linkedAt: "2026-06-15T08:00:00Z" };
}

describe("matchCard", () => {
  it("finds the card with the exact serial", () => {
    const exact = card("53:2E:98:0C");
    expect(matchCard("53:2E:98:0C", [exact])).toBe(exact);
  });

  it("finds a 7-byte card from the reader's 4 bytes, and a 4-byte card from a full 7-byte read", () => {
    const sevenByte = card("53:2E:98:0C:14:00:01");
    const fourByte = card("53:2E:98:0C");
    expect(matchCard("53:2E:98:0C", [sevenByte])).toBe(sevenByte);
    expect(matchCard("53:2E:98:0C:14:00:01", [fourByte])).toBe(fourByte);
  });

  it("prefers the exact serial over a twin", () => {
    const exact = card("53:2E:98:0C", "lost");
    const twin = card("53:2E:98:0C:14:00:01");
    expect(matchCard("53:2E:98:0C", [twin, exact])).toBe(exact);
  });

  it("prefers an active twin over a lost one", () => {
    const lost = card("53:2E:98:0C:AA:AA:AA", "lost", "student-a");
    const active = card("53:2E:98:0C:BB:BB:BB", "active", "student-b");
    expect(matchCard("53:2E:98:0C", [lost, active])).toBe(active);
  });

  it("gives null for two equally good twins, rather than guess a child", () => {
    const one = card("53:2E:98:0C:AA:AA:AA", "active", "student-a");
    const two = card("53:2E:98:0C:BB:BB:BB", "active", "student-b");
    expect(matchCard("53:2E:98:0C", [one, two])).toBeNull();
  });

  it("gives null when nothing shares the first 4 bytes", () => {
    expect(matchCard("53:2E:98:0C", [])).toBeNull();
  });
});
