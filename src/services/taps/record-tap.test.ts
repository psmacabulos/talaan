import { describe, expect, it } from "vitest";
import { createMockCardRepository } from "@/data/repositories/card-repository";
import { createMockSchoolRepository } from "@/data/repositories/school-repository";
import { createMockStudentRepository } from "@/data/repositories/student-repository";
import { createMockTapRepository } from "@/data/repositories/tap-repository";
import type { TapWrite, TapWriter } from "@/data/repositories/tap-writer";
import type { Tap } from "@/features/attendance/types";
import type { NotificationPreference, School } from "@/features/schools/types";
import type { Card, Student } from "@/features/students/types";
import { schoolTimeToIso } from "@/lib/school-time";
import { recordTap, type RecordTapDeps, type RecordTapInput } from "./record-tap";

const GATE = { id: "device-gate", schoolId: "school-a" };
/** The reader's 10 digits for the card below: 53:2E:98:0C. */
const READER_DIGITS = "0211299923";
const MINUTE = 60_000;

function school(notificationPreference: NotificationPreference): School {
  return {
    id: "school-a",
    name: "School A",
    theme: { kind: "preset", presetId: "ocean" },
    showDepedLogo: false,
    notificationPreference,
    lateAfter: "08:05",
    absentFrom: "09:00",
  };
}

const juan: Student = {
  id: "student-juan",
  schoolId: "school-a",
  firstName: "Juan",
  lastName: "Dela Cruz",
  birthDate: "2012-01-01",
  lrn: "100000000001",
  gradeLevel: 7,
  section: "Rizal",
  guardianName: "Maria Dela Cruz",
  guardianMobile: "09171234567",
};

function card(serial: string, status: Card["status"], schoolId = "school-a"): Card {
  return { id: `card-${serial}`, schoolId, studentId: juan.id, serial, status, linkedAt: "2026-06-01T00:00:00.000Z" };
}

/** In-memory stand-ins for the database; the writer stores taps where the tap repository can see them. */
function setup({
  cards = [card("53:2E:98:0C:14:00:01", "active")],
  preference = "time_in_and_time_out" as NotificationPreference,
} = {}) {
  const taps: Tap[] = [];
  const writes: TapWrite[] = [];
  const writer: TapWriter = {
    async record(write) {
      if (taps.some((existing) => existing.id === write.tap.id)) return "exists";
      const window = write.duplicateWindow;
      const inWindow = (existing: Tap) =>
        window !== null &&
        existing.schoolId === write.tap.schoolId &&
        existing.cardSerial === write.tap.cardSerial &&
        existing.tappedAt > window.from &&
        existing.tappedAt < window.to;
      if (taps.some(inWindow)) return "duplicate";
      taps.push(write.tap);
      writes.push(write);
      return "created";
    },
  };
  const deps: RecordTapDeps = {
    cards: createMockCardRepository(cards, { latencyMs: 0 }),
    taps: createMockTapRepository(taps, { latencyMs: 0 }),
    students: createMockStudentRepository([juan], { latencyMs: 0 }),
    schools: createMockSchoolRepository([school(preference)], { latencyMs: 0 }),
    writer,
  };
  return { deps, taps, writes };
}

/** A tap sent at 7:56 AM on the demo Friday, plus `afterMs`. */
function input(afterMs = 0, overrides: Partial<RecordTapInput> = {}): RecordTapInput {
  const at = new Date(Date.parse(schoolTimeToIso("2026-06-19", "07:56")) + afterMs).toISOString();
  return {
    device: GATE,
    clientTapId: crypto.randomUUID(),
    rawSerial: READER_DIGITS,
    clientTappedAt: at,
    receivedAt: at,
    ...overrides,
  };
}

describe("recordTap", () => {
  it("records an active card's tap as a time in, with a notification and the gate's last-seen time", async () => {
    const { deps, writes } = setup();
    const result = await recordTap(input(), deps);

    expect(result).toMatchObject({
      outcome: "recorded",
      direction: "time_in",
      notified: true,
      replayed: false,
      student: { id: juan.id, firstName: "Juan", lastName: "Dela Cruz", gradeLevel: 7, section: "Rizal" },
    });
    expect(writes).toHaveLength(1);
    expect(writes[0].tap).toMatchObject({
      schoolId: "school-a",
      stationId: GATE.id,
      // The card's own 7-byte serial, though the reader sent 4 bytes.
      cardSerial: "53:2E:98:0C:14:00:01",
      studentId: juan.id,
    });
    expect(writes[0].notification).toMatchObject({ studentId: juan.id, kind: "time_in", read: false });
    expect(writes[0].alert).toBeNull();
    expect(writes[0]).toMatchObject({ deviceId: GATE.id, seenAt: writes[0].tap.tappedAt });
  });

  it("never sends the screen anything more personal than name, grade and section", async () => {
    const { deps } = setup();
    const result = await recordTap(input(), deps);
    if (result.outcome !== "recorded") throw new Error("expected a recorded tap");
    expect(Object.keys(result.student).sort()).toEqual(["firstName", "gradeLevel", "id", "lastName", "section"]);
  });

  it("makes the next tap, 2 minutes and 1 second later, a time out", async () => {
    const { deps } = setup();
    await recordTap(input(), deps);
    const second = await recordTap(input(2 * MINUTE + 1000), deps);
    expect(second).toMatchObject({ outcome: "recorded", direction: "time_out", notified: true });
  });

  it("sends no notification for a time out under 'time in only', and none at all under 'off'", async () => {
    const timeInOnly = setup({ preference: "time_in_only" });
    await recordTap(input(), timeInOnly.deps);
    await recordTap(input(3 * MINUTE), timeInOnly.deps);
    expect(timeInOnly.writes.map((write) => write.notification?.kind ?? null)).toEqual(["time_in", null]);

    const off = setup({ preference: "off" });
    const result = await recordTap(input(), off.deps);
    expect(result).toMatchObject({ outcome: "recorded", notified: false });
    expect(off.writes[0].notification).toBeNull();
  });

  it("ignores the same card 1 minute 59 seconds later as a duplicate, writing nothing", async () => {
    const { deps, writes } = setup();
    const first = await recordTap(input(), deps);
    const again = await recordTap(input(MINUTE + 59_000), deps);

    expect(again).toMatchObject({ outcome: "duplicate", student: { id: juan.id } });
    if (first.outcome !== "recorded" || again.outcome !== "duplicate") throw new Error("unexpected outcomes");
    expect(again.previousTap.id).toBe(first.tap.id);
    expect(writes).toHaveLength(1);
  });

  it("also ignores a tap that arrives late but happened 1 minute before a stored one", async () => {
    const { deps, writes } = setup();
    await recordTap(input(), deps);
    const earlier = await recordTap(input(-MINUTE), deps);
    expect(earlier.outcome).toBe("duplicate");
    expect(writes).toHaveLength(1);
  });

  it("stores a lost card's tap with its owner, raises an alert, and notifies nobody", async () => {
    const { deps, writes } = setup({ cards: [card("53:2E:98:0C:14:00:01", "lost")] });
    const result = await recordTap(input(), deps);

    expect(result).toMatchObject({ outcome: "lost_card", student: { id: juan.id }, replayed: false });
    expect(writes[0].tap.studentId).toBe(juan.id);
    expect(writes[0].alert).toMatchObject({ type: "lost_card_tapped", tapId: writes[0].tap.id, acknowledged: false });
    expect(writes[0].notification).toBeNull();
  });

  // Not stored (owner review, 2026-10-13): it's nobody's attendance. The
  // answer carries the card's own serial when one matched (the retired
  // card), and what the reader sent otherwise.
  it.each([
    ["no card at all", [], "53:2E:98:0C"],
    ["a retired card", [card("53:2E:98:0C:14:00:01", "retired")], "53:2E:98:0C:14:00:01"],
    ["another school's card", [card("53:2E:98:0C:14:00:01", "active", "school-b")], "53:2E:98:0C"],
  ])("answers %s as an unknown card, with nobody, and stores nothing", async (_label, cards, serial) => {
    const { deps, writes } = setup({ cards });
    const result = await recordTap(input(), deps);
    expect(result).toMatchObject({
      outcome: "unknown_card",
      replayed: false,
      tap: { studentId: null, cardSerial: serial },
    });
    expect(writes).toHaveLength(0);
  });

  it("says unknown card every time the same unknown card is tapped, never already tapped", async () => {
    const { deps, writes } = setup({ cards: [] });
    expect(await recordTap(input(), deps)).toMatchObject({ outcome: "unknown_card" });
    expect(await recordTap(input(10_000), deps)).toMatchObject({ outcome: "unknown_card" });
    expect(writes).toHaveLength(0);
  });

  it("answers a resent tap the same way, with replayed set, and writes it only once", async () => {
    const { deps, writes } = setup();
    const sent = input();
    const first = await recordTap(sent, deps);
    const resent = await recordTap(sent, deps);

    expect(first).toMatchObject({ outcome: "recorded", direction: "time_in", replayed: false });
    expect(resent).toMatchObject({ outcome: "recorded", direction: "time_in", replayed: true });
    expect(writes).toHaveLength(1);
  });

  it("answers a resent lost-card tap as a lost card", async () => {
    const { deps } = setup({ cards: [card("53:2E:98:0C:14:00:01", "lost")] });
    const sent = input();
    await recordTap(sent, deps);
    expect(await recordTap(sent, deps)).toMatchObject({ outcome: "lost_card", replayed: true });
  });

  it("gives the replay answer when the same tap was written a moment earlier by a racing request", async () => {
    const { deps, taps } = setup();
    const sent = input();
    const realGetById = deps.taps.getById;
    // The first look finds nothing, as if the other request hadn't written yet.
    let firstLook = true;
    deps.taps = {
      ...deps.taps,
      async getById(id) {
        if (firstLook) {
          firstLook = false;
          taps.push({
            id,
            schoolId: "school-a",
            stationId: GATE.id,
            cardSerial: "53:2E:98:0C:14:00:01",
            studentId: juan.id,
            tappedAt: new Date(Date.parse(sent.clientTappedAt) - 3 * MINUTE).toISOString(),
          });
          return null;
        }
        return realGetById(id);
      },
    };
    expect(await recordTap(sent, deps)).toMatchObject({ outcome: "recorded", replayed: true });
  });

  it("asks the writer to check the card's 2 minutes either side again, under its lock (Step 56)", async () => {
    const { deps, writes } = setup();
    const sent = input();
    await recordTap(sent, deps);
    const at = Date.parse(sent.clientTappedAt);
    expect(writes[0].duplicateWindow).toEqual({
      from: new Date(at - 2 * MINUTE).toISOString(),
      to: new Date(at + 2 * MINUTE).toISOString(),
    });
  });

  it("answers Already tapped when another read of the card was stored while this one was on its way (Step 56)", async () => {
    const { deps, taps, writes } = setup();
    const first = input();
    await recordTap(first, deps);
    // The quick check finds nothing, as if the first read hadn't been stored yet; the writer then does.
    const realFind = deps.taps.findByCardBetween;
    let quickCheck = true;
    deps.taps = {
      ...deps.taps,
      async findByCardBetween(...args) {
        if (quickCheck) {
          quickCheck = false;
          return null;
        }
        return realFind(...args);
      },
    };

    const second = await recordTap(input(50), deps);
    expect(second).toMatchObject({
      outcome: "duplicate",
      previousTap: { id: first.clientTapId },
      student: { id: juan.id },
    });
    expect(taps).toHaveLength(1);
    expect(writes).toHaveLength(1);
  });

  it("uses the server's time when the gate's clock is far ahead", async () => {
    const { deps, writes } = setup();
    const sent = input(0, { clientTappedAt: "2030-01-01T00:00:00.000Z" });
    await recordTap(sent, deps);
    expect(writes[0].tap.tappedAt).toBe(sent.receivedAt);
  });

  it("stops at something that isn't a card serial, writing nothing", async () => {
    const { deps, writes } = setup();
    expect(await recordTap(input(0, { rawSerial: "hello" }), deps)).toEqual({ outcome: "invalid_serial" });
    expect(writes).toHaveLength(0);
  });
});
