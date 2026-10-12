import {
  cardRepository,
  schoolRepository,
  studentRepository,
  tapRepository,
  tapWriter,
  type CardRepository,
  type SchoolRepository,
  type StudentRepository,
  type TapRepository,
  type TapWriter,
} from "@/data/repositories";
import { shouldNotifyParents } from "@/features/attendance/notify-parents";
import { tapSchema } from "@/features/attendance/schemas";
import { deriveTapKind } from "@/features/attendance/status";
import type { Alert, Tap } from "@/features/attendance/types";
import type { Notification, NotificationKind } from "@/features/parents/types";
import { firstFourBytes, normalizeCardSerial } from "@/features/students/card-serial";
import type { Card, Student } from "@/features/students/types";
import { matchCard } from "./match-card";
import { chooseTapTime } from "./tap-time";

/** The same card read again this soon, before or after, is one pass through the gate, not two (CLAUDE.md: 1–2 minutes). */
export const DEBOUNCE_MS = 2 * 60_000;

export type RecordTapInput = {
  /** The gate that sent the tap: already checked by its token. */
  device: { id: string; schoolId: string };
  /** A UUID made by the gate, so a resent tap is recognised. */
  clientTapId: string;
  /** Exactly what the reader typed: "0211299923", or hex. */
  rawSerial: string;
  /** The gate's own clock. */
  clientTappedAt: string;
  /** The server's clock when the tap arrived (`getNow()`). */
  receivedAt: string;
};

/** Just what a gate screen shows: never the LRN, birth date or guardian. */
export type TapStudent = Pick<Student, "id" | "firstName" | "lastName" | "gradeLevel" | "section">;

export type RecordTapResult =
  | {
      outcome: "recorded";
      tap: Tap;
      student: TapStudent;
      direction: NotificationKind;
      /** Whether the school's setting sends this tap to parents. */
      notified: boolean;
      replayed: boolean;
    }
  | { outcome: "lost_card"; tap: Tap; student: TapStudent | null; replayed: boolean }
  | { outcome: "unknown_card"; tap: Tap; replayed: boolean }
  | { outcome: "duplicate"; previousTap: Tap; student: TapStudent | null }
  | { outcome: "invalid_serial" };

export type RecordTapDeps = {
  cards: Pick<CardRepository, "listBySerialPrefix" | "getBySerial">;
  // getById stays unscoped on purpose: the replay check compares the stored tap's school with the device's (Step 51).
  taps: Pick<TapRepository, "getById" | "findByCardBetween" | "listByStudent">;
  students: Pick<StudentRepository, "getInSchool">;
  schools: Pick<SchoolRepository, "getById">;
  writer: TapWriter;
};

const DEFAULT_DEPS: RecordTapDeps = {
  cards: cardRepository,
  taps: tapRepository,
  students: studentRepository,
  schools: schoolRepository,
  writer: tapWriter,
};

function toTapStudent(student: Student | null): TapStudent | null {
  if (!student) return null;
  const { id, firstName, lastName, gradeLevel, section } = student;
  return { id, firstName, lastName, gradeLevel, section };
}

/** Time in or time out, and whether the school sends it to parents. */
async function directionOf(tap: Tap, studentId: string, deps: RecordTapDeps) {
  const [studentTaps, school] = await Promise.all([
    deps.taps.listByStudent(tap.schoolId, studentId),
    deps.schools.getById(tap.schoolId),
  ]);
  const direction = deriveTapKind(tap, studentTaps);
  const notified = school ? shouldNotifyParents(school.notificationPreference, direction) : false;
  return { direction, notified };
}

/**
 * The answer for a tap that's already stored: a resend after a dropped
 * connection gets what the first try got, and nothing new is written. A
 * tap stored with a student whose card (by the stored serial) is lost was
 * a lost-card tap; one with a student otherwise was a normal one.
 */
async function replay(tap: Tap, deps: RecordTapDeps): Promise<RecordTapResult> {
  if (!tap.studentId) return { outcome: "unknown_card", tap, replayed: true };

  const [student, card] = await Promise.all([
    deps.students.getInSchool(tap.schoolId, tap.studentId),
    deps.cards.getBySerial(tap.cardSerial),
  ]);
  if (card?.status === "lost" && card.studentId === tap.studentId) {
    return { outcome: "lost_card", tap, student: toTapStudent(student), replayed: true };
  }

  const tapStudent = toTapStudent(student);
  if (!tapStudent) return { outcome: "unknown_card", tap, replayed: true };
  const { direction, notified } = await directionOf(tap, tap.studentId, deps);
  return { outcome: "recorded", tap, student: tapStudent, direction, notified, replayed: true };
}

/** What a matched card makes of a tap. A retired card, like no card at all, is just an unknown card now. */
function tapKindFor(card: Card | null): "valid" | "lost" | "unknown" {
  if (card?.status === "active") return "valid";
  if (card?.status === "lost") return "lost";
  return "unknown";
}

/**
 * One tap from a gate, from the raw serial to everything it writes
 * (docs/backend/step-45-tap-service.md):
 * 1. turn the reader's digits or hex into a serial, or stop;
 * 2. a tap id already stored is a resend: answer as before;
 * 3. find the card at this school (exact, else the first 4 bytes);
 * 4. the same card within 2 minutes, before or after, is a duplicate;
 * 5. write the tap with its alert (lost card) or parent notification
 *    (active card, per the school's setting), and the gate's last-seen
 *    time, in one transaction.
 * The route (Step 46) and the `tap:record` script both call this; neither
 * makes any of these decisions itself.
 */
export async function recordTap(input: RecordTapInput, deps: RecordTapDeps = DEFAULT_DEPS): Promise<RecordTapResult> {
  const serial = normalizeCardSerial(input.rawSerial);
  if (!serial) return { outcome: "invalid_serial" };

  const { device } = input;
  const stored = await deps.taps.getById(input.clientTapId);
  if (stored && stored.schoolId === device.schoolId) return replay(stored, deps);

  const tappedAt = chooseTapTime(input.clientTappedAt, input.receivedAt);
  const candidates = await deps.cards.listBySerialPrefix(device.schoolId, firstFourBytes(serial));
  const card = matchCard(serial, candidates);
  // The card's own serial when one matched, so a 4-byte read of a 7-byte
  // card is stored under one serial every time and the debounce sees it.
  const cardSerial = card?.serial ?? serial;

  const at = Date.parse(tappedAt);
  const previousTap = await deps.taps.findByCardBetween(
    device.schoolId,
    cardSerial,
    new Date(at - DEBOUNCE_MS).toISOString(),
    new Date(at + DEBOUNCE_MS).toISOString(),
  );
  if (previousTap) {
    const student = previousTap.studentId
      ? await deps.students.getInSchool(device.schoolId, previousTap.studentId)
      : null;
    return { outcome: "duplicate", previousTap, student: toTapStudent(student) };
  }

  const kind = tapKindFor(card);
  // A lost card's tap keeps its owner, so the alert can name them (recipe
  // decision 4); an unknown card has nobody.
  const studentId = card && kind !== "unknown" ? card.studentId : null;
  const tap = tapSchema.parse({
    id: input.clientTapId,
    schoolId: device.schoolId,
    stationId: device.id,
    cardSerial,
    studentId,
    tappedAt,
  });

  const student = studentId ? await deps.students.getInSchool(device.schoolId, studentId) : null;
  let alert: Alert | null = null;
  let notification: Notification | null = null;
  let result: RecordTapResult;

  if (kind === "valid" && student) {
    const { direction, notified } = await directionOf(tap, student.id, deps);
    if (notified) {
      notification = {
        id: crypto.randomUUID(),
        schoolId: tap.schoolId,
        studentId: student.id,
        kind: direction,
        tappedAt: tap.tappedAt,
        read: false,
      };
    }
    result = { outcome: "recorded", tap, student: toTapStudent(student)!, direction, notified, replayed: false };
  } else if (kind === "lost") {
    alert = {
      id: crypto.randomUUID(),
      schoolId: tap.schoolId,
      tapId: tap.id,
      type: "lost_card_tapped",
      createdAt: input.receivedAt,
      acknowledged: false,
    };
    result = { outcome: "lost_card", tap, student: toTapStudent(student), replayed: false };
  } else {
    result = { outcome: "unknown_card", tap, replayed: false };
  }

  const written = await deps.writer.record({
    tap,
    alert,
    notification,
    deviceId: device.id,
    seenAt: input.receivedAt,
  });
  if (written === "exists") {
    const winner = await deps.taps.getById(tap.id);
    if (winner && winner.schoolId === device.schoolId) return replay(winner, deps);
  }
  return result;
}
