import { describe, expect, it } from "vitest";
import type { CardTap } from "./record-tap";
import { toGateTapEvent } from "./publish-tap";
import { publishTap, subscribeToTaps, type GateTapEvent } from "./tap-events";

const event: GateTapEvent = {
  id: "t1",
  outcome: "unknown_card",
  direction: null,
  tappedAt: "2026-06-18T23:56:00.000Z",
  student: null,
};

describe("tap events", () => {
  it("reach listeners of the same school only, and stop after unsubscribing", () => {
    const heardA: GateTapEvent[] = [];
    const heardB: GateTapEvent[] = [];
    const stopA = subscribeToTaps("school-a", (tap) => heardA.push(tap));
    const stopB = subscribeToTaps("school-b", (tap) => heardB.push(tap));

    publishTap("school-a", event);
    expect(heardA).toEqual([event]);
    expect(heardB).toEqual([]);

    stopA();
    publishTap("school-a", { ...event, id: "t2" });
    expect(heardA).toHaveLength(1);
    stopB();
  });
});

describe("toGateTapEvent", () => {
  const tap: CardTap = {
    id: "t1",
    schoolId: "school-a",
    stationId: "device-gate",
    cardSerial: "04:11:6C:C7",
    studentId: "s1",
    tappedAt: "2026-06-18T23:56:00.000Z",
  };
  const student = { id: "s1", firstName: "Juan", lastName: "Cruz", gradeLevel: 7 as const, section: "Rizal" };

  it("passes a recorded tap with its direction and photo", () => {
    expect(
      toGateTapEvent(
        { outcome: "recorded", tap, student, direction: "time_in", notified: true, replayed: false },
        "/p.webp",
      ),
    ).toEqual({
      id: "t1",
      outcome: "recorded",
      direction: "time_in",
      tappedAt: tap.tappedAt,
      student: { ...student, photo: "/p.webp" },
    });
  });

  it("passes a lost card with its owner, and an unknown card with nobody", () => {
    expect(toGateTapEvent({ outcome: "lost_card", tap, student, replayed: false }, null)).toMatchObject({
      outcome: "lost_card",
      direction: null,
      student: { id: "s1", photo: null },
    });
    expect(
      toGateTapEvent({ outcome: "unknown_card", tap: { ...tap, studentId: null }, replayed: false }, null),
    ).toMatchObject({
      outcome: "unknown_card",
      student: null,
    });
  });

  it("passes nothing for a duplicate, a resend or a bad read", () => {
    expect(toGateTapEvent({ outcome: "duplicate", previousTap: tap, student }, null)).toBeNull();
    expect(
      toGateTapEvent({ outcome: "recorded", tap, student, direction: "time_in", notified: true, replayed: true }, null),
    ).toBeNull();
    expect(toGateTapEvent({ outcome: "invalid_serial" }, null)).toBeNull();
  });
});
