import type { Student } from "@/features/students/types";
import type { AuditField } from "./types";

const STUDENT_FIELDS = [
  "firstName",
  "middleName",
  "lastName",
  "birthDate",
  "lrn",
  "gradeLevel",
  "section",
  "guardianName",
  "guardianMobile",
] as const satisfies readonly (keyof Student & AuditField)[];

type Fields = Pick<Student, (typeof STUDENT_FIELDS)[number]>;

/**
 * The names of the fields a student's Save changed (Step 60.1), and "photo"
 * when the photo was added, replaced or removed. Names only: what they
 * changed *to* is never kept.
 */
export function changedStudentFields(before: Fields, after: Fields, photoChanged: boolean): AuditField[] {
  const changed: AuditField[] = STUDENT_FIELDS.filter((field) => before[field] !== after[field]);
  if (photoChanged) changed.push("photo");
  return changed;
}
