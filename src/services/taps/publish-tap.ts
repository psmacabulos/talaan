import { studentRepository, type StudentRepository } from "@/data/repositories";
import { photoPath } from "@/features/students/photo";
import type { RecordTapResult } from "./record-tap";
import { publishTap, type GateTapEvent } from "./tap-events";

/**
 * The monitor's view of a `recordTap()` answer, or null when there's nothing
 * new to show: a duplicate, a resend, or a card that couldn't be read. An
 * unknown card isn't stored, but the guard still sees it, every time.
 */
export function toGateTapEvent(result: RecordTapResult, photo: string | null): GateTapEvent | null {
  if (result.outcome === "duplicate" || result.outcome === "invalid_serial" || result.replayed) return null;
  const base = { id: result.tap.id, tappedAt: result.tap.tappedAt };
  if (result.outcome === "unknown_card") return { ...base, outcome: "unknown_card", direction: null, student: null };

  const student = result.student
    ? {
        id: result.student.id,
        firstName: result.student.firstName,
        lastName: result.student.lastName,
        gradeLevel: result.student.gradeLevel,
        section: result.student.section,
        photo,
      }
    : null;
  if (result.outcome === "lost_card") return { ...base, outcome: "lost_card", direction: null, student };
  return { ...base, outcome: "recorded", direction: result.direction, student };
}

/** Sends a new tap, or an unknown card, to every open monitor of its school (Step 48). */
export async function publishStoredTap(
  result: RecordTapResult,
  students: Pick<StudentRepository, "getInSchool"> = studentRepository,
): Promise<void> {
  if (!("tap" in result) || result.replayed) return;
  // From the answer, not the tap: a lost card's tap has no student, but its
  // owner's photo still goes to the monitor (Step 57).
  const studentId = "student" in result ? result.student?.id : undefined;
  const student = studentId ? await students.getInSchool(result.tap.schoolId, studentId) : null;
  const event = toGateTapEvent(result, student?.photoKey ? photoPath(student.photoKey) : null);
  if (event) publishTap(result.tap.schoolId, event);
}
