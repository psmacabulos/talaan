import { describe, expect, it } from "vitest";
import { MAIN_GATE_STATION_ID } from "@/features/attendance/status";
import type { Tap } from "@/features/attendance/types";
import type { Card, Student } from "@/features/students/types";
import { resolveStationTap, type StationTapContext } from "./resolve-station-tap";

const SCHOOL_ID = "school-test";
const NOW = "2026-06-20T09:15:00Z";
const IDS = { tapId: "00000000-0000-4000-8000-000000000099", alertId: "alert-new" };

function student(overrides: Partial<Student> & Pick<Student, "id">): Student {
  return {
    schoolId: SCHOOL_ID,
    firstName: "Ana",
    lastName: "Cruz",
    birthDate: "2012-01-01",
    gradeLevel: 8,
    section: "Rizal",
    guardianName: "Ana's guardian",
    guardianMobile: "09171234567",
    ...overrides,
  };
}

function card(overrides: Partial<Card> & Pick<Card, "id" | "studentId" | "status" | "serial">): Card {
  return {
    schoolId: SCHOOL_ID,
    linkedAt: "2026-06-01T08:00:00Z",
    ...overrides,
  };
}

function tap(overrides: Partial<Tap> & Pick<Tap, "id" | "studentId" | "cardSerial" | "tappedAt">): Tap {
  return {
    schoolId: SCHOOL_ID,
    stationId: MAIN_GATE_STATION_ID,
    ...overrides,
  };
}

const ana = student({ id: "s-ana", firstName: "Ana", lastName: "Cruz" });
const ben = student({ id: "s-ben", firstName: "Ben", lastName: "Dela Cruz" });

const anaActiveCard = card({ id: "c-ana", studentId: "s-ana", status: "active", serial: "04:01:01:01:01:01:01" });
const benLostCard = card({ id: "c-ben-lost", studentId: "s-ben", status: "lost", serial: "04:02:02:02:02:02:02" });

function context(overrides: Partial<StationTapContext> = {}): StationTapContext {
  return { schoolId: SCHOOL_ID, students: [ana, ben], taps: [], cards: [anaActiveCard, benLostCard], now: NOW, ...overrides };
}

describe("resolveStationTap: valid", () => {
  it("picks the first waiting student who has an active card", () => {
    const outcome = resolveStationTap("valid", context(), IDS);
    expect(outcome).toMatchObject({
      status: "recorded",
      kind: "valid",
      studentName: "Ana Cruz",
      gradeSection: "Grade 8 – Rizal",
    });
    if (outcome.status === "recorded" && outcome.kind === "valid") {
      expect(outcome.tap).toEqual({
        id: IDS.tapId,
        schoolId: SCHOOL_ID,
        stationId: MAIN_GATE_STATION_ID,
        cardSerial: anaActiveCard.serial,
        studentId: "s-ana",
        tappedAt: NOW,
      });
    }
  });

  it("skips a student with no active card (e.g. a lost one) and returns empty if nobody else qualifies", () => {
    const outcome = resolveStationTap("valid", context({ students: [ben], cards: [benLostCard] }), IDS);
    expect(outcome).toEqual({ status: "empty", kind: "valid" });
  });

  it("skips a student who already tapped today", () => {
    const alreadyTapped = tap({ id: "t-1", studentId: "s-ana", cardSerial: anaActiveCard.serial, tappedAt: NOW });
    const outcome = resolveStationTap("valid", context({ students: [ana], taps: [alreadyTapped] }), IDS);
    expect(outcome).toEqual({ status: "empty", kind: "valid" });
  });

  it("returns empty when there are no students at all", () => {
    const outcome = resolveStationTap("valid", context({ students: [], cards: [] }), IDS);
    expect(outcome).toEqual({ status: "empty", kind: "valid" });
  });
});

describe("resolveStationTap: duplicate", () => {
  it("reports the existing tap for a student who already tapped today, without creating a new one", () => {
    const existing = tap({ id: "t-1", studentId: "s-ana", cardSerial: anaActiveCard.serial, tappedAt: "2026-06-20T07:56:00Z" });
    const outcome = resolveStationTap("duplicate", context({ taps: [existing] }), IDS);
    expect(outcome).toEqual({ status: "ignored", kind: "duplicate", existingTap: existing, studentName: "Ana Cruz" });
  });

  it("returns empty when nobody has tapped yet", () => {
    const outcome = resolveStationTap("duplicate", context(), IDS);
    expect(outcome).toEqual({ status: "empty", kind: "duplicate" });
  });
});

describe("resolveStationTap: lost", () => {
  it("taps the lost card's original owner and raises a matching alert", () => {
    const outcome = resolveStationTap("lost", context(), IDS);
    expect(outcome).toEqual({
      status: "recorded",
      kind: "lost",
      tap: {
        id: IDS.tapId,
        schoolId: SCHOOL_ID,
        stationId: MAIN_GATE_STATION_ID,
        cardSerial: benLostCard.serial,
        studentId: "s-ben",
        tappedAt: NOW,
      },
      alert: { id: IDS.alertId, tapId: IDS.tapId, createdAt: NOW },
      studentName: "Ben Dela Cruz",
    });
  });

  it("returns empty when no card on file is lost", () => {
    const outcome = resolveStationTap("lost", context({ cards: [anaActiveCard] }), IDS);
    expect(outcome).toEqual({ status: "empty", kind: "lost" });
  });
});

describe("resolveStationTap: unknown", () => {
  it("creates a tap with no linked student, using a serial not on file", () => {
    const outcome = resolveStationTap("unknown", context(), IDS);
    expect(outcome.status).toBe("recorded");
    if (outcome.status === "recorded" && outcome.kind === "unknown") {
      expect(outcome.tap.studentId).toBeNull();
      expect(outcome.tap.id).toBe(IDS.tapId);
      expect([anaActiveCard.serial, benLostCard.serial]).not.toContain(outcome.tap.cardSerial);
    }
  });
});
