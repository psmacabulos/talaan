import { studentRepository, type StudentRepository } from "@/data/repositories";
import { photoPath } from "@/features/students/photo";
import type { RecordTapResult } from "./record-tap";
import { publishTap, type GateTapEvent } from "./tap-events";

/**
 * The monitor's view of a `recordTap()` answer, or null when nothing new was
 * stored: a duplicate, a resend, or a card that couldn't be read.
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

/** Sends a newly stored tap to every open monitor of its school (Step 48). */
export async function publishStoredTap(
  result: RecordTapResult,
  students: Pick<StudentRepository, "getById"> = studentRepository,
): Promise<void> {
  if (!("tap" in result) || result.replayed) return;
  const student = result.tap.studentId ? await students.getById(result.tap.studentId) : null;
  const event = toGateTapEvent(result, student?.photoKey ? photoPath(student.photoKey) : null);
  if (event) publishTap(result.tap.schoolId, event);
}
