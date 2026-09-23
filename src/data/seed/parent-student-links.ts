import type { ParentStudentLink } from "@/features/parents/types";

/**
 * The many-to-many links between seed parents and seed students. Deliberately
 * demonstrates both directions of the relationship, so later steps have real
 * data for both cases:
 *
 * - `parent-balanga-1` links TWO students (`student-0001`, `student-0002`) —
 *   one parent, several children.
 * - `student-0001` links TWO parents (`parent-balanga-1`, `parent-balanga-2`)
 *   — one child, several guardians (e.g. a mother and a father both notified).
 *
 * Step 24 added one link per school to a student who hasn't tapped today
 * AND has an active card, chosen so it's the very first student the
 * dashboard's "Simulate a tap" button picks at that school — otherwise no
 * simulated tap could ever reach a linked child (the original linked
 * students either already tapped in the seed morning or have no card
 * issued), and Step 24's "simulating a tap adds a notification" would be
 * impossible to see. Each is the first tappable student in roster order:
 *
 * - `student-0006` (Balanga) — already left untapped on purpose by
 *   taps.ts, so the grade 7 Rizal teacher's class has someone still to
 *   arrive; the principal's first simulate click taps them too. Balanga's
 *   preference is `time_in_and_time_out`, so this link demonstrates a
 *   notification firing.
 * - `student-0043` (Oceanview) — `student-0037` has no card issued, so
 *   0043 is the first tappable student there. Oceanview's preference is
 *   `time_in_only`, so the resulting time-in still fires.
 * - `student-0057` (Crimsonridge) — `student-0055` has no card issued, so
 *   0057 is the first tappable student there. Crimsonridge's preference is
 *   `off`, so this link demonstrates the opposite: the tap is recorded but
 *   NO notification is created.
 *
 * Every link's `schoolId` matches the school of both its parent and student
 * (a parent is scoped to one school), so the link is never cross-school.
 */
export const seedParentStudentLinks: ParentStudentLink[] = [
  {
    id: "link-balanga-1a",
    schoolId: "school-balanga",
    parentId: "parent-balanga-1",
    studentId: "student-0001",
    linkedAt: "2026-06-01T08:00:00Z",
  },
  {
    id: "link-balanga-1b",
    schoolId: "school-balanga",
    parentId: "parent-balanga-1",
    studentId: "student-0002",
    linkedAt: "2026-06-01T08:00:00Z",
  },
  {
    id: "link-balanga-2",
    schoolId: "school-balanga",
    parentId: "parent-balanga-2",
    studentId: "student-0001",
    linkedAt: "2026-06-01T08:00:00Z",
  },
  {
    id: "link-balanga-1c",
    schoolId: "school-balanga",
    parentId: "parent-balanga-1",
    studentId: "student-0006",
    linkedAt: "2026-06-01T08:00:00Z",
  },
  {
    id: "link-oceanview-1",
    schoolId: "school-oceanview",
    parentId: "parent-oceanview-1",
    studentId: "student-0037",
    linkedAt: "2026-06-01T08:00:00Z",
  },
  {
    id: "link-oceanview-2",
    schoolId: "school-oceanview",
    parentId: "parent-oceanview-2",
    studentId: "student-0038",
    linkedAt: "2026-06-01T08:00:00Z",
  },
  {
    id: "link-oceanview-1b",
    schoolId: "school-oceanview",
    parentId: "parent-oceanview-1",
    studentId: "student-0043",
    linkedAt: "2026-06-01T08:00:00Z",
  },
  {
    id: "link-crimsonridge-1",
    schoolId: "school-crimsonridge",
    parentId: "parent-crimsonridge-1",
    studentId: "student-0055",
    linkedAt: "2026-06-01T08:00:00Z",
  },
  {
    id: "link-crimsonridge-2",
    schoolId: "school-crimsonridge",
    parentId: "parent-crimsonridge-2",
    studentId: "student-0056",
    linkedAt: "2026-06-01T08:00:00Z",
  },
  {
    id: "link-crimsonridge-1b",
    schoolId: "school-crimsonridge",
    parentId: "parent-crimsonridge-1",
    studentId: "student-0057",
    linkedAt: "2026-06-01T08:00:00Z",
  },
];
