import type { GradeLevel, Student } from "@/features/students/types";
import { nameAt } from "./names";

/** Typical age at the start of the school year, by grade — used only to
 * generate a plausible birth date; never stored as "age" itself. */
const TYPICAL_AGE_BY_GRADE: Record<GradeLevel, number> = {
  7: 12,
  8: 13,
  9: 14,
  10: 15,
  11: 16,
  12: 17,
};

/** School-year anchor the seed data's ages are computed relative to, so the
 * data (and anything that reads it) stays the same no matter what day this
 * actually runs. */
const SCHOOL_YEAR_START = 2026;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function birthDateAt(gradeLevel: GradeLevel, index: number): string {
  const age = TYPICAL_AGE_BY_GRADE[gradeLevel] + (index % 2);
  const year = SCHOOL_YEAR_START - age;
  const month = (index % 12) + 1;
  const day = (index % 28) + 1;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function lrnAt(index: number): string | undefined {
  // Only some students have an LRN on file yet, matching the type's own
  // "optional" — every 3rd student is missing one.
  if (index % 3 === 0) return undefined;
  return String(100_000_000_000 + index);
}

function guardianMobileAt(index: number): string {
  return `09${String(170_000_001 + index).padStart(9, "0")}`;
}

export type SectionSlot = { schoolId: string; gradeLevel: GradeLevel; section: string };

// 12 sections total (CLAUDE.md's "72 students across grades 7 to 12 and 12
// sections"): the pilot school (Balanga) has all 6 grades, the two smaller
// demo schools split the other 6 between them — 12 sections × 6 students
// each = 72. Exported so src/data/seed/staff.ts can give each school's
// teacher a real advisory section instead of a made-up one.
export const SECTION_SLOTS: SectionSlot[] = [
  { schoolId: "school-balanga", gradeLevel: 7, section: "Rizal" },
  { schoolId: "school-balanga", gradeLevel: 8, section: "Bonifacio" },
  { schoolId: "school-balanga", gradeLevel: 9, section: "Mabini" },
  { schoolId: "school-balanga", gradeLevel: 10, section: "Luna" },
  { schoolId: "school-balanga", gradeLevel: 11, section: "Aguinaldo" },
  { schoolId: "school-balanga", gradeLevel: 12, section: "Silang" },
  { schoolId: "school-oceanview", gradeLevel: 7, section: "Lapu-Lapu" },
  { schoolId: "school-oceanview", gradeLevel: 8, section: "Del Pilar" },
  { schoolId: "school-oceanview", gradeLevel: 9, section: "Jacinto" },
  { schoolId: "school-crimsonridge", gradeLevel: 10, section: "Aglipay" },
  { schoolId: "school-crimsonridge", gradeLevel: 11, section: "Ponce" },
  { schoolId: "school-crimsonridge", gradeLevel: 12, section: "Tandang Sora" },
];

const STUDENTS_PER_SECTION = 6;

export const seedStudents: Student[] = SECTION_SLOTS.flatMap((slot, slotIndex) =>
  Array.from({ length: STUDENTS_PER_SECTION }, (_, seatIndex) => {
    const index = slotIndex * STUDENTS_PER_SECTION + seatIndex;
    const { firstName, lastName } = nameAt(index);
    // Guardians share the student's own surname (usually a parent). The
    // offset must not be a multiple of FIRST_NAMES.length (40) — it was
    // 1000 before, which silently made every guardian's first name equal
    // the student's own (found visually in Step 29's review: every row's
    // second line was an exact duplicate of the name above it).
    const guardianFirstName = nameAt(index + 13).firstName;

    const student: Student = {
      id: `student-${String(index + 1).padStart(4, "0")}`,
      schoolId: slot.schoolId,
      firstName,
      lastName,
      birthDate: birthDateAt(slot.gradeLevel, index),
      lrn: lrnAt(index),
      gradeLevel: slot.gradeLevel,
      section: slot.section,
      guardianName: `${guardianFirstName} ${lastName}`,
      guardianMobile: guardianMobileAt(index),
    };
    return student;
  }),
);
