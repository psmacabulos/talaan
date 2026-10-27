import { cardRepository, schoolRepository, studentRepository, tapRepository, tapWriter } from "@/data/repositories";
import { shouldNotifyParents } from "@/features/attendance/notify-parents";
import { tapSchema } from "@/features/attendance/schemas";
import type { Tap } from "@/features/attendance/types";
import type { TapNotification } from "@/features/parents/types";
import { nextDate, schoolDateOf, schoolTimeToIso } from "@/lib/school-time";
import {
  MANUAL_STATION_ID,
  mayRecordFor,
  nameBasedUuid,
  type ManualTimeInDeps,
  type ManualTimeInInput,
} from "./record-manual-time-in";
import { toTapStudent, type TapStudent } from "./record-tap";

export type ManualTimeOutResult =
  /** The same shape as a gate's `recorded` result, so the guardhouse monitor shows it the same way. */
  | {
      outcome: "recorded";
      tap: Tap;
      student: TapStudent;
      direction: "time_out";
      notified: boolean;
      replayed: false;
    }
  /** No tap today: there's no time in to time out from. */
  | { outcome: "no_time_in"; student: TapStudent }
  /** The newest tap is already a time out, or another click or a gate read got there first. */
  | { outcome: "already_out"; student: TapStudent }
  /** Not a student this staff member may record: not at their school, or not in a teacher's own class. */
  | { outcome: "not_found" };

const DEFAULT_DEPS: ManualTimeInDeps = {
  students: studentRepository,
  taps: tapRepository,
  cards: cardRepository,
  schools: schoolRepository,
  writer: tapWriter,
};

/**
 * One id per student, school day and number of taps already seen. Two clicks
 * on the same row make the same id, so the database keeps one; a later time
 * out, after a card's tap back in, sees one more tap and gets its own.
 */
export function manualTimeOutId(studentId: string, date: string, tapsBefore: number): string {
  return nameBasedUuid(`manual-time-out|${studentId}|${date}|${tapsBefore}`);
}

/**
 * A time out recorded by hand (Step 59.4), for a student going home whose
 * card didn't work or who has none. Only while they're in: taps alternate
 * in and out, so with an odd number of taps today the next one is a time
 * out, and nothing needs storing to say so. There's no back in by hand
 * (owner, 2026-10-27): recording by hand only bridges the days until a card
 * is replaced. Recorded as now, by the same people and through the same
 * writer as `recordManualTimeIn`.
 */
export async function recordManualTimeOut(
  input: ManualTimeInInput,
  deps: ManualTimeInDeps = DEFAULT_DEPS,
): Promise<ManualTimeOutResult> {
  const student = await deps.students.getInSchool(input.schoolId, input.studentId);
  if (!student || !mayRecordFor(input.staff, student)) return { outcome: "not_found" };
  const tapStudent = toTapStudent(student)!;

  const date = schoolDateOf(input.now);
  const [todaysTaps, card, school] = await Promise.all([
    deps.taps.listByStudentOnDate(input.schoolId, student.id, date),
    deps.cards.getActiveForStudent(input.schoolId, student.id),
    deps.schools.getById(input.schoolId),
  ]);
  const lastTap = todaysTaps.at(-1);
  if (!lastTap) return { outcome: "no_time_in", student: tapStudent };
  if (todaysTaps.length % 2 === 0) return { outcome: "already_out", student: tapStudent };

  const tap = tapSchema.parse({
    id: manualTimeOutId(student.id, date, todaysTaps.length),
    schoolId: input.schoolId,
    stationId: MANUAL_STATION_ID,
    cardSerial: card?.serial ?? null,
    studentId: student.id,
    tappedAt: input.now,
    source: "manual",
    recordedById: input.staff.id,
  });

  const notified = school ? shouldNotifyParents(school.notificationPreference, "time_out") : false;
  const notification: TapNotification | null = notified
    ? {
        id: crypto.randomUUID(),
        schoolId: tap.schoolId,
        studentId: student.id,
        kind: "time_out",
        tappedAt: tap.tappedAt,
        read: false,
        recipientParentId: null,
      }
    : null;

  // With a card, the write locks it and looks for any tap of it after the
  // last one seen here (Step 56): a gate read landing in between would make
  // this one a second "out", read back as in, out, in. With no card, no
  // gate read can race it.
  const duplicateWindow = card ? { from: lastTap.tappedAt, to: schoolTimeToIso(nextDate(date), "00:00") } : null;
  const written = await deps.writer.record({
    tap,
    alert: null,
    notification,
    deviceId: null,
    seenAt: input.now,
    duplicateWindow,
  });
  if (written !== "created") return { outcome: "already_out", student: tapStudent };
  return { outcome: "recorded", tap, student: tapStudent, direction: "time_out", notified, replayed: false };
}
