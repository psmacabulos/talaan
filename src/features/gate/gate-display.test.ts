import { describe, expect, it } from "vitest";
import { schoolTimeToIso } from "@/lib/school-time";
import { describeScan, type GateScan } from "./gate-display";
import type { GateTapResponse } from "./responses";

const juan = { id: "s1", firstName: "Juan", lastName: "Cruz", gradeLevel: 7 as const, section: "Rizal" };
const at756 = schoolTimeToIso("2026-06-19", "07:56");

function scan(state: GateScan["state"], rosterStudent: GateScan["rosterStudent"] = { ...juan, photo: null }): GateScan {
  return { id: "x", raw: "0211299923", scannedAt: at756, rosterStudent, state };
}

const answered = (response: GateTapResponse) => scan({ kind: "answered", response });

describe("describeScan", () => {
  it("shows the roster's guess while checking", () => {
    expect(describeScan(scan({ kind: "checking" }))).toEqual({
      tone: "idle",
      name: "Juan Cruz",
      grade: "Grade 7 – Rizal",
      message: "Checking…",
      short: "Checking…",
      at: at756,
    });
  });

  it("shows time in and time out in green", () => {
    const timeIn = answered({
      outcome: "recorded",
      direction: "time_in",
      tappedAt: at756,
      notified: true,
      replayed: false,
      student: juan,
    });
    expect(describeScan(timeIn)).toMatchObject({
      tone: "present",
      name: "Juan Cruz",
      message: "Time in 7:56 AM",
      short: "Time in",
      at: at756,
    });
    const timeOut = answered({
      outcome: "recorded",
      direction: "time_out",
      tappedAt: at756,
      notified: true,
      replayed: false,
      student: juan,
    });
    expect(describeScan(timeOut).message).toBe("Time out 7:56 AM");
  });

  it("shows a duplicate in amber with the earlier time", () => {
    expect(describeScan(answered({ outcome: "duplicate", previousTappedAt: at756, student: juan }))).toMatchObject({
      tone: "late",
      message: "Already tapped at 7:56 AM",
      short: "Already tapped",
    });
  });

  it("sends a lost card to the office in red", () => {
    const lost = answered({
      outcome: "lost_card",
      tappedAt: at756,
      cardSerial: "04:11",
      replayed: false,
      student: juan,
    });
    expect(describeScan(lost)).toMatchObject({ tone: "absent", name: "Juan Cruz", short: "Lost card" });
  });

  it("names nobody for an unknown card or a bad read", () => {
    const unknown = answered({ outcome: "unknown_card", tappedAt: at756, cardSerial: "53:2E:98:0C", replayed: false });
    expect(describeScan(unknown)).toMatchObject({
      tone: "idle",
      name: null,
      message: "Card not recognised. Please see the office.",
    });
    expect(describeScan(answered({ outcome: "invalid_serial" }))).toMatchObject({ name: null, short: "Couldn't read" });
  });

  it("says plainly when a scan couldn't be sent", () => {
    expect(describeScan(scan({ kind: "failed" }))).toMatchObject({ tone: "idle", message: "Not sent: no connection." });
  });
});
