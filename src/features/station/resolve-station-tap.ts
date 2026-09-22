import { MAIN_GATE_STATION_ID, studentsWithoutTapToday, todaysTap } from "@/features/attendance/status";
import type { Tap } from "@/features/attendance/types";
import { generateCardSerial } from "@/features/students/card-serial";
import type { Card, Student } from "@/features/students/types";

export type StationTapKind = "valid" | "duplicate" | "lost" | "unknown";

export interface StationTapContext {
  schoolId: string;
  students: Student[];
  taps: Tap[];
  cards: Card[];
  now: string;
}

export interface StationTapIds {
  tapId: string;
  alertId: string;
}

export type StationTapOutcome =
  | { status: "recorded"; kind: "valid"; tap: Tap; studentName: string; gradeSection: string }
  | {
      status: "recorded";
      kind: "lost";
      tap: Tap;
      alert: { id: string; tapId: string; createdAt: string };
      studentName: string | null;
    }
  | { status: "recorded"; kind: "unknown"; tap: Tap }
  | { status: "ignored"; kind: "duplicate"; existingTap: Tap; studentName: string }
  | { status: "empty"; kind: StationTapKind };

function fullName(student: Student): string {
  return `${student.firstName} ${student.lastName}`;
}

function activeCardFor(studentId: string, cards: Card[]): Card | undefined {
  return cards.find((card) => card.studentId === studentId && card.status === "active");
}

/**
 * Picks who/what a simulated kiosk button press actually taps, and what
 * that produces — a pure function of the data it's handed, so it can run
 * identically online (fed fresh repository data by `station-actions.ts`) or
 * offline (fed the tap station's own already-loaded snapshot plus whatever
 * it's queued locally so far, by `tap-station-kiosk.tsx`). That's what
 * makes the offline queue behave correctly: two "Valid card" presses in a
 * row while offline pick two *different* students, because the second call
 * is given the first call's tap folded into `context.taps`.
 *
 * `ids` are always supplied by the caller (`crypto.randomUUID()`) rather
 * than generated in here, so the same id survives from "queued offline" to
 * "actually persisted once synced" — the same reasoning as CLAUDE.md's
 * "idempotent by a device-made UUID" rule for a real station.
 */
export function resolveStationTap(kind: StationTapKind, context: StationTapContext, ids: StationTapIds): StationTapOutcome {
  const { schoolId, students, taps, cards, now } = context;

  if (kind === "valid") {
    const waiting = studentsWithoutTapToday(students, taps, now);
    const student = waiting.find((candidate) => activeCardFor(candidate.id, cards));
    if (!student) return { status: "empty", kind };

    const card = activeCardFor(student.id, cards)!;
    const tap: Tap = {
      id: ids.tapId,
      schoolId,
      stationId: MAIN_GATE_STATION_ID,
      cardSerial: card.serial,
      studentId: student.id,
      tappedAt: now,
    };
    return {
      status: "recorded",
      kind: "valid",
      tap,
      studentName: fullName(student),
      gradeSection: `Grade ${student.gradeLevel} – ${student.section}`,
    };
  }

  if (kind === "duplicate") {
    const student = students.find(
      (candidate) => todaysTap(candidate.id, taps, now) && activeCardFor(candidate.id, cards),
    );
    if (!student) return { status: "empty", kind };

    const existingTap = todaysTap(student.id, taps, now)!;
    return { status: "ignored", kind: "duplicate", existingTap, studentName: fullName(student) };
  }

  if (kind === "lost") {
    const lostCard = cards.find((card) => card.status === "lost");
    if (!lostCard) return { status: "empty", kind };

    const student = students.find((candidate) => candidate.id === lostCard.studentId) ?? null;
    const tap: Tap = {
      id: ids.tapId,
      schoolId,
      stationId: MAIN_GATE_STATION_ID,
      cardSerial: lostCard.serial,
      studentId: lostCard.studentId,
      tappedAt: now,
    };
    return {
      status: "recorded",
      kind: "lost",
      tap,
      alert: { id: ids.alertId, tapId: ids.tapId, createdAt: now },
      studentName: student ? fullName(student) : null,
    };
  }

  // "unknown": a serial that doesn't belong to any card on file at all,
  // active or otherwise — unlike Step 16's `isSerialAvailable`, which only
  // cares about active-card collisions.
  let serial = generateCardSerial();
  for (let attempt = 0; attempt < 5 && cards.some((card) => card.serial === serial); attempt++) {
    serial = generateCardSerial();
  }
  const tap: Tap = {
    id: ids.tapId,
    schoolId,
    stationId: MAIN_GATE_STATION_ID,
    cardSerial: serial,
    studentId: null,
    tappedAt: now,
  };
  return { status: "recorded", kind: "unknown", tap };
}
