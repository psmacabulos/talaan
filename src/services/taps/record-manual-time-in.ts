import { createHash } from "node:crypto";
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
import type { Tap } from "@/features/attendance/types";
import type { TapNotification } from "@/features/parents/types";
import type { Staff } from "@/features/staff/types";
import type { Student } from "@/features/students/types";
import { nextDate, schoolDateOf, schoolTimeToIso } from "@/lib/school-time";
import { toTapStudent, type TapStudent } from "./record-tap";

/** The `stationId` of a tap recorded by hand: it never claims a gate read it. */
export const MANUAL_STATION_ID = "manual";

/** Who is recording the tap. A teacher's advisory class limits whom they can record. */
export type ManualTapStaff = Pick<Staff, "id" | "role" | "advisoryGradeLevel" | "advisorySection">;

export type ManualTimeInInput = {
  /** The signed-in staff member's school: the student must be in it. */
  schoolId: string;
  studentId: string;
  staff: ManualTapStaff;
  /** The server's clock (`getNow()`): the time in is recorded as now. */
  now: string;
};

export type ManualTimeInResult =
  /** The same shape as a gate's `recorded` result, so the guardhouse monitor shows it the same way. */
  | {
      outcome: "recorded";
      tap: Tap;
      student: TapStudent;
      direction: "time_in";
      notified: boolean;
      replayed: false;
    }
  /** The student already has a tap today, from a gate or recorded by hand. */
  | { outcome: "already_tapped"; student: TapStudent }
  /** Not a student this staff member may record: not at their school, or not in a teacher's own class. */
  | { outcome: "not_found" };

export type ManualTimeInDeps = {
  students: Pick<StudentRepository, "getInSchool">;
  taps: Pick<TapRepository, "listByStudentOnDate">;
  cards: Pick<CardRepository, "getActiveForStudent">;
  schools: Pick<SchoolRepository, "getById">;
  writer: TapWriter;
};

const DEFAULT_DEPS: ManualTimeInDeps = {
  students: studentRepository,
  taps: tapRepository,
  cards: cardRepository,
  schools: schoolRepository,
  writer: tapWriter,
};

/**
 * One fixed id per student per school day, shaped as a version 5 (name-based)
 * UUID so it passes the tap's UUID check. A second click, or a second staff
 * member at the same moment, makes the same id, and the database keeps only
 * one: one tap, one parent notification (Step 55's architect review).
 */
export function manualTimeInId(studentId: string, date: string): string {
  const hex = createHash("sha256").update(`manual-time-in|${studentId}|${date}`).digest("hex");
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** A principal or super admin records anyone at their school; a teacher only their own advisory class. */
function mayRecordFor(staff: ManualTapStaff, student: Student): boolean {
  if (staff.role !== "teacher") return true;
  return student.gradeLevel === staff.advisoryGradeLevel && student.section === staff.advisorySection;
}

/**
 * A time in recorded by hand (Step 55), for a student whose card didn't
 * work or who has none: replaces the old random "Simulate a tap". Only for
 * a student with no tap yet today, so it's always a time in, and it's
 * recorded as now, so a late arrival shows as late. The student's active
 * card serial is kept when they have one, so a card that finally reads a
 * minute later is caught by the gate's 2-minute check instead of becoming
 * a time out. The tap and its parent notification are written together,
 * through the same writer as a gate's taps.
 */
export async function recordManualTimeIn(
  input: ManualTimeInInput,
  deps: ManualTimeInDeps = DEFAULT_DEPS,
): Promise<ManualTimeInResult> {
  const student = await deps.students.getInSchool(input.schoolId, input.studentId);
  if (!student || !mayRecordFor(input.staff, student)) return { outcome: "not_found" };
  const tapStudent = toTapStudent(student)!;

  const date = schoolDateOf(input.now);
  const [todaysTaps, card, school] = await Promise.all([
    deps.taps.listByStudentOnDate(input.schoolId, student.id, date),
    deps.cards.getActiveForStudent(input.schoolId, student.id),
    deps.schools.getById(input.schoolId),
  ]);
  if (todaysTaps.length > 0) return { outcome: "already_tapped", student: tapStudent };

  const tap = tapSchema.parse({
    id: manualTimeInId(student.id, date),
    schoolId: input.schoolId,
    stationId: MANUAL_STATION_ID,
    cardSerial: card?.serial ?? null,
    studentId: student.id,
    tappedAt: input.now,
    source: "manual",
    recordedById: input.staff.id,
  });

  const notified = school ? shouldNotifyParents(school.notificationPreference, "time_in") : false;
  const notification: TapNotification | null = notified
    ? {
        id: crypto.randomUUID(),
        schoolId: tap.schoolId,
        studentId: student.id,
        kind: "time_in",
        tappedAt: tap.tappedAt,
        read: false,
        recipientParentId: null,
      }
    : null;

  // With a card, the write locks it and checks the whole school day again
  // (Step 56), so a gate read of the same card landing in between can't make
  // a time in and a time out. With no card, no gate read can race it.
  const duplicateWindow = card
    ? { from: schoolTimeToIso(date, "00:00"), to: schoolTimeToIso(nextDate(date), "00:00") }
    : null;
  const written = await deps.writer.record({
    tap,
    alert: null,
    notification,
    deviceId: null,
    seenAt: input.now,
    duplicateWindow,
  });
  if (written !== "created") return { outcome: "already_tapped", student: tapStudent };
  return { outcome: "recorded", tap, student: tapStudent, direction: "time_in", notified, replayed: false };
}
