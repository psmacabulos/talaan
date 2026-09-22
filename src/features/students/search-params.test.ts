import { describe, expect, it } from "vitest";
import { parseStudentListParams, studentListHref, type StudentListParams } from "./search-params";

const DEFAULTS: StudentListParams = { q: "", grade: "all", card: "all", sort: "name", dir: "asc", page: 1 };

describe("parseStudentListParams", () => {
  it("defaults every field from an empty searchParams object", () => {
    expect(parseStudentListParams({})).toEqual(DEFAULTS);
  });

  it("parses valid values for every field", () => {
    expect(parseStudentListParams({ q: "juan", grade: "9", card: "lost", sort: "age", dir: "desc", page: "3" })).toEqual({
      q: "juan",
      grade: 9,
      card: "lost",
      sort: "age",
      dir: "desc",
      page: 3,
    });
  });

  it("falls back to defaults for out-of-range or garbage values instead of throwing", () => {
    expect(parseStudentListParams({ grade: "13" }).grade).toBe("all");
    expect(parseStudentListParams({ grade: "not-a-number" }).grade).toBe("all");
    expect(parseStudentListParams({ card: "stolen" }).card).toBe("all");
    expect(parseStudentListParams({ sort: "guardian" }).sort).toBe("name");
    expect(parseStudentListParams({ dir: "sideways" }).dir).toBe("asc");
    expect(parseStudentListParams({ page: "0" }).page).toBe(1);
    expect(parseStudentListParams({ page: "-1" }).page).toBe(1);
    expect(parseStudentListParams({ page: "1.5" }).page).toBe(1);
  });

  it("takes the first value when a param repeats in the URL", () => {
    expect(parseStudentListParams({ q: ["first", "second"] }).q).toBe("first");
  });

  it("trims whitespace from the search text", () => {
    expect(parseStudentListParams({ q: "  juan  " }).q).toBe("juan");
  });
});

describe("studentListHref", () => {
  it("is just '/students' when every value is the default", () => {
    expect(studentListHref(DEFAULTS)).toBe("/students");
  });

  it("only writes non-default fields to the query string", () => {
    expect(studentListHref(DEFAULTS, { page: 2 })).toBe("/students?page=2");
  });

  it("preserves existing params that aren't part of the override", () => {
    const current: StudentListParams = { ...DEFAULTS, q: "juan", card: "lost" };
    const href = studentListHref(current, { page: 2 });
    expect(href).toContain("q=juan");
    expect(href).toContain("card=lost");
    expect(href).toContain("page=2");
  });

  it("overrides can reset a field back to its default, dropping it from the query string", () => {
    const current: StudentListParams = { ...DEFAULTS, page: 3 };
    expect(studentListHref(current, { page: 1 })).toBe("/students");
  });
});
