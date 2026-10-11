import { describe, expect, it } from "vitest";
import type { GateRoster } from "./roster";
import { findRosterStudent } from "./roster-match";

const juan = { id: "s1", firstName: "Juan", lastName: "Cruz", gradeLevel: 7 as const, section: "Rizal", photo: null };
const ana = { id: "s2", firstName: "Ana", lastName: "Reyes", gradeLevel: 8 as const, section: "Mabini", photo: null };

const roster: GateRoster = {
  cards: [
    { serial: "53:2E:98:0C:14:00:01", studentId: "s1" },
    { serial: "04:11:6C:C7", studentId: "s2" },
  ],
  students: [juan, ana],
};

describe("findRosterStudent", () => {
  it("finds a 7-byte card from the reader's 10 digits (its first 4 bytes)", () => {
    expect(findRosterStudent("0211299923", roster)).toEqual(juan);
  });

  it("finds a 4-byte card from a full 7-byte read, and an exact match", () => {
    expect(findRosterStudent("04:11:6C:C7:22:7D:D8", roster)).toEqual(ana);
    expect(findRosterStudent("04:11:6C:C7", roster)).toEqual(ana);
  });

  it("gives null for an unknown card, an unreadable scan, or no roster yet", () => {
    expect(findRosterStudent("0213292883", roster)).toBeNull();
    expect(findRosterStudent("hello", roster)).toBeNull();
    expect(findRosterStudent("0211299923", null)).toBeNull();
  });

  it("never guesses between two cards with the same first 4 bytes", () => {
    const twins: GateRoster = {
      cards: [
        { serial: "53:2E:98:0C:AA:AA:AA", studentId: "s1" },
        { serial: "53:2E:98:0C:BB:BB:BB", studentId: "s2" },
      ],
      students: [juan, ana],
    };
    expect(findRosterStudent("0211299923", twins)).toBeNull();
  });
});
