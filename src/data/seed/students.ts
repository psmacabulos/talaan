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

/**
 * `index` drives everything that must stay unique per student (id, LRN,
 * card serial, birth date) — it's fine for this to keep counting up forever.
 * `nameIndex` drives only the name, and defaults to `index`, but the spare
 * batch below passes a different one: `nameAt`/its FIRST_NAMES/LAST_NAMES
 * pool repeats with period 40, and Balanga's own roster (indices 0-35)
 * already uses every residue from 0-35, so naively continuing the same
 * index past 71 for naming re-mints an EXISTING Balanga student's exact
 * name (index 80 % 40 = 0 → "Juan Cruz" again, student-0001's name — found
 * via students.spec.ts's "replace a student's card" test, which searches by
 * name and got two "Edit Juan Cruz" rows once that collision existed).
 */
function studentAt(index: number, slot: SectionSlot, nameIndex: number = index): Student {
  const { firstName, lastName } = nameAt(nameIndex);
  // Guardians share the student's own surname (usually a parent). The
  // offset must not be a multiple of FIRST_NAMES.length (40) — it was
  // 1000 before, which silently made every guardian's first name equal
  // the student's own (found visually in Step 29's review: every row's
  // second line was an exact duplicate of the name above it).
  const guardianFirstName = nameAt(nameIndex + 13).firstName;

  return {
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
}

const rosterStudents: Student[] = SECTION_SLOTS.flatMap((slot, slotIndex) =>
  Array.from({ length: STUDENTS_PER_SECTION }, (_, seatIndex) => studentAt(slotIndex * STUDENTS_PER_SECTION + seatIndex, slot)),
);

/** Index of the first student after the normal 72-strong roster — taps.ts
 * uses this to keep the spare batch below out of its "everyone's morning"
 * generator, so they stay untapped. */
export const ROSTER_STUDENT_COUNT = rosterStudents.length;

// A spare batch of otherwise-ordinary Balanga students who never get a
// seeded tap (see taps.ts). The tap-station e2e suite's "Valid card" button
// always picks the *first* untapped student, and in CI several spec files
// click it against the same shared server (station.spec.ts, parent.spec.ts,
// a11y.spec.ts's tap-station check) across both the mobile and desktop
// projects — up to 11 clicks in the worst case. The roster above only ever
// leaves 6 students untapped, so without this batch the later clicks find
// nobody left and fail. Kept in Rizal (grade 7, same section as the
// roster's own untapped student) rather than a made-up section, since
// nothing else in the app singles this section out by exact class size.
//
// Named from residues 36-39, one each, no repeats: Balanga's own roster
// (indices 0-35) already occupies every other residue mod 40, so those four
// are the only ones guaranteed not to reproduce an existing Balanga
// student's name (see studentAt's `nameIndex` comment) — and not to repeat
// each other, which matters because parent.spec.ts looks up whichever
// student got tapped by full name; a repeated name would find the wrong
// one. Four is also enough: worst case, the suite's other tests draw at
// most 6 of the 10 total (existing 6 + these 4) before the CI-only single
// desktop test that must succeed gets its turn (see playwright.config.ts's
// `workers` comment) — plenty of headroom.
const SPARE_STUDENT_COUNT = 4;
const SAFE_NAME_RESIDUES = [36, 37, 38, 39];
const spareStudents: Student[] = Array.from({ length: SPARE_STUDENT_COUNT }, (_, seatIndex) =>
  studentAt(rosterStudents.length + seatIndex, SECTION_SLOTS[0], SAFE_NAME_RESIDUES[seatIndex]),
);

export const seedStudents: Student[] = [...rosterStudents, ...spareStudents];
