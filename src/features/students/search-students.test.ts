import { describe, expect, it } from "vitest";
import { createMockCardRepository, createMockStudentRepository } from "@/data/repositories";
import { searchStudents } from "./search-students";
import type { StudentListParams } from "./search-params";
import type { Card, Student } from "./types";

const SCHOOL_ID = "school-test";

function student(overrides: Partial<Student> & Pick<Student, "id" | "firstName" | "lastName">): Student {
  return {
    schoolId: SCHOOL_ID,
    birthDate: "2012-01-01",
    gradeLevel: 8,
    section: "Rizal",
    guardianName: `${overrides.firstName}'s guardian`,
    guardianMobile: "09171234567",
    ...overrides,
  };
}

const students: Student[] = [
  student({ id: "s-ana", firstName: "Ana", lastName: "Cruz", lrn: "111111111111", birthDate: "2012-01-01" }),
  student({ id: "s-ben", firstName: "Ben", lastName: "Dela Cruz", birthDate: "2011-01-01" }),
  student({
    id: "s-carla",
    firstName: "Carla",
    lastName: "Reyes",
    gradeLevel: 9,
    section: "Mabini",
    lrn: "222222222222",
    birthDate: "2010-01-01",
  }),
  student({ id: "s-dado", firstName: "Dado", lastName: "Santos", gradeLevel: 10, section: "Luna", birthDate: "2013-01-01" }),
  student({ id: "s-ela", firstName: "Ela", lastName: "Torres", gradeLevel: 10, section: "Luna", birthDate: "2012-06-01" }),
];

function card(overrides: Partial<Card> & Pick<Card, "id" | "studentId" | "status">): Card {
  return {
    schoolId: SCHOOL_ID,
    serial: "04:A3:5F:2B:91:C0:80",
    linkedAt: "2026-06-01T08:00:00Z",
    ...overrides,
  };
}

const cards: Card[] = [
  card({ id: "c-ana", studentId: "s-ana", status: "active" }),
  card({ id: "c-ben", studentId: "s-ben", status: "lost" }),
  // s-carla: no card at all.
  card({ id: "c-dado", studentId: "s-dado", status: "active" }),
  card({ id: "c-ela-old", studentId: "s-ela", status: "lost", linkedAt: "2026-01-01T08:00:00Z" }),
  card({ id: "c-ela-new", studentId: "s-ela", status: "active", linkedAt: "2026-06-01T08:00:00Z" }),
];

const deps = {
  students: createMockStudentRepository(students, { latencyMs: 0 }),
  cards: createMockCardRepository(cards, { latencyMs: 0 }),
};

const BASE: StudentListParams = { q: "", grade: "all", card: "all", sort: "name", dir: "asc", page: 1 };

describe("searchStudents", () => {
  it("returns every student in the school, sorted by name, by default", async () => {
    const result = await searchStudents(SCHOOL_ID, BASE, {}, deps);
    expect(result.total).toBe(5);
    expect(result.items.map((row) => row.student.firstName)).toEqual(["Ana", "Ben", "Carla", "Dado", "Ela"]);
  });

  it("matches the search text against name and LRN, case-insensitively", async () => {
    const byName = await searchStudents(SCHOOL_ID, { ...BASE, q: "cruz" }, {}, deps);
    expect(byName.items.map((row) => row.student.firstName)).toEqual(["Ana", "Ben"]);

    const byLrn = await searchStudents(SCHOOL_ID, { ...BASE, q: "222222" }, {}, deps);
    expect(byLrn.items.map((row) => row.student.firstName)).toEqual(["Carla"]);
  });

  it("filters by grade", async () => {
    const result = await searchStudents(SCHOOL_ID, { ...BASE, grade: 8 }, {}, deps);
    expect(result.items.map((row) => row.student.firstName)).toEqual(["Ana", "Ben"]);
  });

  it("filters by card status, treating a re-issued card as active", async () => {
    const active = await searchStudents(SCHOOL_ID, { ...BASE, card: "active" }, {}, deps);
    expect(active.items.map((row) => row.student.firstName)).toEqual(["Ana", "Dado", "Ela"]);

    const lost = await searchStudents(SCHOOL_ID, { ...BASE, card: "lost" }, {}, deps);
    expect(lost.items.map((row) => row.student.firstName)).toEqual(["Ben"]);

    const none = await searchStudents(SCHOOL_ID, { ...BASE, card: "none" }, {}, deps);
    expect(none.items.map((row) => row.student.firstName)).toEqual(["Carla"]);
  });

  it("restricts to one grade and section, for a teacher's advisory class", async () => {
    const result = await searchStudents(
      SCHOOL_ID,
      BASE,
      { restrictTo: { gradeLevel: 10, section: "Luna" } },
      deps,
    );
    expect(result.items.map((row) => row.student.firstName)).toEqual(["Dado", "Ela"]);
  });

  it("returns nothing for a teacher with no advisory class assigned yet", async () => {
    const result = await searchStudents(
      SCHOOL_ID,
      BASE,
      { restrictTo: { gradeLevel: undefined, section: undefined } },
      deps,
    );
    expect(result.total).toBe(0);
  });

  it("sorts by age, youngest first, ties kept in original order", async () => {
    const result = await searchStudents(SCHOOL_ID, { ...BASE, sort: "age" }, {}, deps);
    expect(result.items.map((row) => row.student.firstName)).toEqual(["Dado", "Ana", "Ela", "Ben", "Carla"]);
  });

  it("sorts by grade and section, then reverses for descending", async () => {
    const asc = await searchStudents(SCHOOL_ID, { ...BASE, sort: "grade" }, {}, deps);
    expect(asc.items.map((row) => row.student.firstName)).toEqual(["Ana", "Ben", "Carla", "Dado", "Ela"]);

    const desc = await searchStudents(SCHOOL_ID, { ...BASE, sort: "grade", dir: "desc" }, {}, deps);
    expect(desc.items.map((row) => row.student.firstName)).toEqual(["Dado", "Ela", "Carla", "Ana", "Ben"]);
  });

  it("sorts by card status", async () => {
    const result = await searchStudents(SCHOOL_ID, { ...BASE, sort: "card" }, {}, deps);
    expect(result.items.map((row) => row.student.firstName)).toEqual(["Ana", "Dado", "Ela", "Ben", "Carla"]);
  });

  it("attaches each row's full card history, not just the derived status", async () => {
    const result = await searchStudents(SCHOOL_ID, BASE, {}, deps);
    const ela = result.items.find((row) => row.student.firstName === "Ela");
    expect(ela?.cards.map((c) => c.id).sort()).toEqual(["c-ela-new", "c-ela-old"]);

    const carla = result.items.find((row) => row.student.firstName === "Carla");
    expect(carla?.cards).toEqual([]);
  });

  it("paginates without changing the total, and returns nothing past the last page", async () => {
    const pageOne = await searchStudents(SCHOOL_ID, { ...BASE, page: 1 }, {}, deps);
    expect(pageOne.total).toBe(5);
    expect(pageOne.items).toHaveLength(5);

    const pageTwo = await searchStudents(SCHOOL_ID, { ...BASE, page: 2 }, {}, deps);
    expect(pageTwo.total).toBe(5);
    expect(pageTwo.items).toHaveLength(0);
  });
});
