import { cardRepository, studentRepository } from "@/data/repositories";
import type { CardRepository, StudentRepository } from "@/data/repositories";
import { ageInYears } from "./age";
import { deriveCardStatus, type CardFilterStatus } from "./card-status";
import { STUDENTS_PAGE_SIZE, type StudentListParams } from "./search-params";
import type { Student } from "./types";

export interface StudentRow {
  student: Student;
  cardStatus: CardFilterStatus;
}

export interface StudentSearchResult {
  items: StudentRow[];
  total: number;
}

function matchesQuery(student: Student, query: string): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  const name = `${student.firstName} ${student.lastName}`.toLowerCase();
  return name.includes(needle) || (student.lrn?.includes(needle) ?? false);
}

function compareRows(a: StudentRow, b: StudentRow, params: StudentListParams): number {
  let result: number;
  switch (params.sort) {
    case "grade":
      result = a.student.gradeLevel - b.student.gradeLevel || a.student.section.localeCompare(b.student.section);
      break;
    case "age":
      result = ageInYears(a.student.birthDate) - ageInYears(b.student.birthDate);
      break;
    case "card":
      result = a.cardStatus.localeCompare(b.cardStatus);
      break;
    case "name":
    default:
      result =
        a.student.lastName.localeCompare(b.student.lastName) ||
        a.student.firstName.localeCompare(b.student.firstName);
      break;
  }
  return params.dir === "desc" ? -result : result;
}

/**
 * Composes the Student and Card repositories into one searchable,
 * sortable, paginated list — a student's card status isn't on the Student
 * record itself, so it needs its own lookup per student. This mirrors the
 * dashboard's own precedent (src/app/(app)/dashboard/page.tsx) of doing a
 * small per-student repository call rather than reshaping the repository
 * interfaces for one screen's filter.
 */
export async function searchStudents(
  schoolId: string,
  params: StudentListParams,
  options: { restrictTo?: { gradeLevel: Student["gradeLevel"] | undefined; section: string | undefined } } = {},
  // Defaults to the real mock repositories; tests inject their own small,
  // deterministic ones (the same createMock*Repository factories every
  // other repository test uses) instead of relying on the full seed data.
  deps: { students?: StudentRepository; cards?: CardRepository } = {},
): Promise<StudentSearchResult> {
  const students = deps.students ?? studentRepository;
  const cards = deps.cards ?? cardRepository;
  const allStudents = await students.listBySchool(schoolId);

  // A teacher with no advisory class assigned yet (undefined gradeLevel or
  // section) naturally matches zero students here, same fallback the
  // dashboard's own teacher branch relies on (src/app/(app)/dashboard/page.tsx).
  const scoped = options.restrictTo
    ? allStudents.filter(
        (student) =>
          student.gradeLevel === options.restrictTo?.gradeLevel && student.section === options.restrictTo.section,
      )
    : allStudents;

  const filteredByText = scoped.filter((student) => matchesQuery(student, params.q));
  const filteredByGrade =
    params.grade === "all" ? filteredByText : filteredByText.filter((student) => student.gradeLevel === params.grade);

  const cardsByStudent = await Promise.all(filteredByGrade.map((student) => cards.listByStudent(student.id)));
  const rows: StudentRow[] = filteredByGrade.map((student, index) => ({
    student,
    cardStatus: deriveCardStatus(cardsByStudent[index] ?? []),
  }));

  const filteredByCard = params.card === "all" ? rows : rows.filter((row) => row.cardStatus === params.card);

  const sorted = [...filteredByCard].sort((a, b) => compareRows(a, b, params));

  const total = sorted.length;
  const start = (params.page - 1) * STUDENTS_PAGE_SIZE;
  const items = sorted.slice(start, start + STUDENTS_PAGE_SIZE);

  return { items, total };
}
