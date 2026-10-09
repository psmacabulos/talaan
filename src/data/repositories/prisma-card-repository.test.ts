import { describe, expect, it } from "vitest";
import type { Card as CardRow } from "@/generated/prisma/client";
import { toCard, toCardData } from "./prisma-card-repository";

const row: CardRow = {
  id: "card-a",
  schoolId: "school-a",
  studentId: "student-a",
  serial: "04:A3:5F:2B:91:C0:80",
  status: "active",
  linkedAt: new Date("2026-06-01T08:00:00Z"),
};

describe("toCard", () => {
  it("turns a database row into the app's Card, with the time as an ISO string", () => {
    expect(toCard(row)).toEqual({
      id: "card-a",
      schoolId: "school-a",
      studentId: "student-a",
      serial: "04:A3:5F:2B:91:C0:80",
      status: "active",
      linkedAt: "2026-06-01T08:00:00.000Z",
    });
  });

  it("rejects a serial that isn't uppercase hex pairs", () => {
    expect(() => toCard({ ...row, serial: "04a35f2b" })).toThrow();
  });
});

describe("toCardData", () => {
  it("round-trips: a card saved and read back is the same card", () => {
    const card = toCard(row);
    expect(toCard({ ...row, ...toCardData(card) })).toEqual(card);
  });
});
