import { describe, expect, it } from "vitest";
import type { Tap as TapRow } from "@/generated/prisma/client";
import { toTap, toTapData } from "./prisma-tap-repository";

const row: TapRow = {
  id: "00000000-0000-4000-8000-000000000001",
  schoolId: "school-a",
  stationId: "station-main-gate",
  cardSerial: "04:A3:5F:2B:91:C0:80",
  studentId: "student-a",
  tappedAt: new Date("2026-06-20T07:56:00Z"),
  source: "card",
  recordedById: null,
};

describe("toTap", () => {
  it("turns a database row into the app's Tap, with the time as an ISO string", () => {
    expect(toTap(row)).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      schoolId: "school-a",
      stationId: "station-main-gate",
      cardSerial: "04:A3:5F:2B:91:C0:80",
      studentId: "student-a",
      tappedAt: "2026-06-20T07:56:00.000Z",
      source: "card",
      recordedById: null,
    });
  });

  it("keeps a time in recorded by hand, with who recorded it and no card (Step 55)", () => {
    const tap = toTap({ ...row, cardSerial: null, source: "manual", recordedById: "staff-a" });
    expect(tap).toMatchObject({ cardSerial: null, source: "manual", recordedById: "staff-a" });
    expect(toTap({ ...row, ...toTapData(tap) })).toEqual(tap);
  });

  it("keeps an unknown card's tap, with no student", () => {
    expect(toTap({ ...row, studentId: null }).studentId).toBeNull();
  });

  it("rejects an id that isn't a UUID", () => {
    expect(() => toTap({ ...row, id: "tap-1" })).toThrow();
  });
});

describe("toTapData", () => {
  it("round-trips: a tap saved and read back is the same tap", () => {
    const tap = toTap(row);
    expect(toTap({ ...row, ...toTapData(tap) })).toEqual(tap);
  });
});
