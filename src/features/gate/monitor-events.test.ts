import { describe, expect, it } from "vitest";
import type { Tap } from "@/features/attendance/types";
import type { Student } from "@/features/students/types";
import { schoolTimeToIso } from "@/lib/school-time";
import type { GateTapEvent } from "@/services/taps/tap-events";
import { mergeMonitorEvents, monitorEventsFromTaps } from "./monitor-events";

const juan: Student = {
  id: "s1",
  schoolId: "school-a",
  firstName: "Juan",
  lastName: "Cruz",
  birthDate: "2012-01-01",
  lrn: "100000000001",
  gradeLevel: 7,
  section: "Rizal",
  guardianName: "Maria",
  guardianMobile: "09171234567",
  photoKey: "school-a/s1/abc123.webp",
};

const tap = (id: string, time: string, studentId: string | null = "s1"): Tap => ({
  id,
  schoolId: "school-a",
  stationId: "gate",
  cardSerial: "04:11:6C:C7",
  studentId,
  tappedAt: schoolTimeToIso("2026-06-19", time),
});

describe("monitorEventsFromTaps", () => {
  it("lists the newest first, with time in and out by order, a lost card, and an unknown card", () => {
    const events = monitorEventsFromTaps(
      [tap("a", "07:50"), tap("b", "12:00"), tap("c", "12:30", null), tap("d", "13:00", null)],
      [juan],
      new Map([["d", "s1"]]),
    );
    expect(events.map((event) => [event.id, event.outcome, event.direction])).toEqual([
      ["d", "lost_card", null],
      ["c", "unknown_card", null],
      ["b", "recorded", "time_out"],
      ["a", "recorded", "time_in"],
    ]);
    // A lost card's tap has no student; the alert names the owner.
    expect(events[0].student?.id).toBe("s1");
    expect(events[2].student).toEqual({
      id: "s1",
      firstName: "Juan",
      lastName: "Cruz",
      gradeLevel: 7,
      section: "Rizal",
      photo: "/api/v1/photos/school-a/s1/abc123.webp",
    });
  });

  it("keeps only the latest 12", () => {
    const many = Array.from({ length: 20 }, (_, i) => tap(`t${i}`, `08:${String(i).padStart(2, "0")}`));
    expect(monitorEventsFromTaps(many, [juan], new Map())).toHaveLength(12);
  });

  it("doesn't let a lost card's tap shift its owner's time in to a time out (Step 57)", () => {
    const events = monitorEventsFromTaps(
      [tap("lost", "07:10", null), tap("own", "07:30")],
      [juan],
      new Map([["lost", "s1"]]),
    );
    expect(events.map((event) => [event.id, event.outcome, event.direction])).toEqual([
      ["own", "recorded", "time_in"],
      ["lost", "lost_card", null],
    ]);
  });
});

describe("mergeMonitorEvents", () => {
  const event = (id: string, at: string): GateTapEvent => ({
    id,
    outcome: "unknown_card",
    direction: null,
    tappedAt: at,
    student: null,
  });

  it("keeps each tap once, newest first", () => {
    const merged = mergeMonitorEvents(
      [event("new", "2026-06-19T01:00:00.000Z"), event("both", "2026-06-19T00:30:00.000Z")],
      [event("both", "2026-06-19T00:30:00.000Z"), event("old", "2026-06-19T00:00:00.000Z")],
    );
    expect(merged.map((item) => item.id)).toEqual(["new", "both", "old"]);
  });
});
