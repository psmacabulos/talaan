import type { GradeLevel } from "./types";
import type { CardFilterStatus } from "./card-status";

export type StudentSortField = "name" | "grade" | "age" | "card";
export type SortDirection = "asc" | "desc";
export type CardFilter = "all" | CardFilterStatus;

export interface StudentListParams {
  q: string;
  grade: GradeLevel | "all";
  card: CardFilter;
  sort: StudentSortField;
  dir: SortDirection;
  page: number;
}

export const STUDENTS_PAGE_SIZE = 10;

const DEFAULT_PARAMS: StudentListParams = {
  q: "",
  grade: "all",
  card: "all",
  sort: "name",
  dir: "asc",
  page: 1,
};

const GRADE_LEVELS: readonly GradeLevel[] = [7, 8, 9, 10, 11, 12];
const CARD_FILTERS: readonly CardFilter[] = ["all", "active", "lost", "none"];
const SORT_FIELDS: readonly StudentSortField[] = ["name", "grade", "age", "card"];

function firstValue(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Next's `searchParams` for a page can hold anything a URL bar can hold.
 * Every field here falls back to its default rather than throwing, so a
 * hand-edited or stale URL (an old bookmark, a typo) just lands on sane
 * behavior instead of an error page.
 */
export function parseStudentListParams(raw: Record<string, string | string[] | undefined>): StudentListParams {
  const q = firstValue(raw.q)?.trim() ?? DEFAULT_PARAMS.q;

  const rawGrade = firstValue(raw.grade);
  const gradeNumber = rawGrade === undefined ? undefined : Number(rawGrade);
  const grade =
    gradeNumber !== undefined && GRADE_LEVELS.includes(gradeNumber as GradeLevel)
      ? (gradeNumber as GradeLevel)
      : DEFAULT_PARAMS.grade;

  const rawCard = firstValue(raw.card);
  const card = CARD_FILTERS.includes(rawCard as CardFilter) ? (rawCard as CardFilter) : DEFAULT_PARAMS.card;

  const rawSort = firstValue(raw.sort);
  const sort = SORT_FIELDS.includes(rawSort as StudentSortField)
    ? (rawSort as StudentSortField)
    : DEFAULT_PARAMS.sort;

  const rawDir = firstValue(raw.dir);
  const dir = rawDir === "asc" || rawDir === "desc" ? rawDir : DEFAULT_PARAMS.dir;

  const rawPage = firstValue(raw.page);
  const pageNumber = rawPage === undefined ? undefined : Number(rawPage);
  const page = pageNumber !== undefined && Number.isInteger(pageNumber) && pageNumber >= 1 ? pageNumber : DEFAULT_PARAMS.page;

  return { q, grade, card, sort, dir, page };
}

/**
 * Builds a `/students?...` URL for the given params, applying `overrides` on
 * top first (e.g. a sort-header link keeps the current search text but
 * changes `sort`/`dir`, and resets `page` back to 1). Only non-default
 * values are written to the query string, so the plain "show everything"
 * view has no query string at all.
 */
export function studentListHref(current: StudentListParams, overrides: Partial<StudentListParams> = {}): string {
  const merged: StudentListParams = { ...current, ...overrides };
  const search = new URLSearchParams();

  if (merged.q !== DEFAULT_PARAMS.q) search.set("q", merged.q);
  if (merged.grade !== DEFAULT_PARAMS.grade) search.set("grade", String(merged.grade));
  if (merged.card !== DEFAULT_PARAMS.card) search.set("card", merged.card);
  if (merged.sort !== DEFAULT_PARAMS.sort) search.set("sort", merged.sort);
  if (merged.dir !== DEFAULT_PARAMS.dir) search.set("dir", merged.dir);
  if (merged.page !== DEFAULT_PARAMS.page) search.set("page", String(merged.page));

  const query = search.toString();
  return query ? `/students?${query}` : "/students";
}
