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
];
