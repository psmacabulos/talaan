import { describe, expect, it } from "vitest";
import type { Tap } from "@/features/attendance/types";
import type { TapStudent } from "@/services/taps/record-tap";
import { toGateTapResponse } from "./responses";

const tap: Tap = {
  id: "6f1c2b7e-3a4d-4e5f-8a9b-0c1d2e3f4a5b",
  schoolId: "school-a",
  stationId: "device-gate",
  cardSerial: "53:2E:98:0C",
  studentId: "student-juan",
  tappedAt: "2026-06-18T23:56:00.000Z",
};

// Extra fields a careless caller might pass along: none of them may reach the gate.
const student = {
  id: "student-juan",
  firstName: "Juan",
  lastName: "Cruz",
  gradeLevel: 7,
  section: "Rizal",
  lrn: "100000000001",
  birthDate: "2012-01-01",
  guardianMobile: "09171234567",
} as TapStudent;

const STUDENT_KEYS = ["firstName", "gradeLevel", "id", "lastName", "section"];

describe("toGateTapResponse", () => {
  it("shapes a recorded tap, with only the student's name, grade and section", () => {
    const response = toGateTapResponse({
      outcome: "recorded",
      tap,
      student,
      direction: "time_in",
      notified: true,
      replayed: false,
    });
    expect(response).toMatchObject({
      outcome: "recorded",
      direction: "time_in",
      tappedAt: tap.tappedAt,
      notified: true,
    });
    if (response.outcome !== "recorded") throw new Error("expected recorded");
    expect(Object.keys(response.student).sort()).toEqual(STUDENT_KEYS);
  });

  it("gives a duplicate the earlier tap's time", () => {
    expect(toGateTapResponse({ outcome: "duplicate", previousTap: tap, student: null })).toEqual({
      outcome: "duplicate",
      previousTappedAt: tap.tappedAt,
      student: null,
    });
  });

  it("gives a lost card its serial and owner, and nothing more personal", () => {
    const response = toGateTapResponse({ outcome: "lost_card", tap, student, replayed: false });
    expect(response).toMatchObject({ outcome: "lost_card", cardSerial: "53:2E:98:0C" });
    if (response.outcome !== "lost_card" || !response.student) throw new Error("expected a lost card with a student");
    expect(Object.keys(response.student).sort()).toEqual(STUDENT_KEYS);
  });

  it("gives an unknown card its serial", () => {
    expect(toGateTapResponse({ outcome: "unknown_card", tap, replayed: true })).toEqual({
      outcome: "unknown_card",
      tappedAt: tap.tappedAt,
      cardSerial: "53:2E:98:0C",
      replayed: true,
    });
  });

  it("passes a bad read through on its own", () => {
    expect(toGateTapResponse({ outcome: "invalid_serial" })).toEqual({ outcome: "invalid_serial" });
  });
});
