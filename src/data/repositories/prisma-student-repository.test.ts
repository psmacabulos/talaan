import { describe, expect, it } from "vitest";
import type { Student as StudentRow } from "@/generated/prisma/client";
import type { Student } from "@/features/students/types";
import { toStudent, toStudentData } from "./prisma-student-repository";

const row: StudentRow = {
  id: "student-a",
  schoolId: "school-a",
  firstName: "Juan",
  middleName: null,
  lastName: "Cruz",
  birthDate: new Date("2013-04-09T00:00:00Z"),
  lrn: "100000000001",
  gradeLevel: 7,
  section: "Rizal",
  guardianName: "Maria Cruz",
  guardianMobile: "09171234567",
  photoUrl: null,
  createdAt: new Date("2026-10-08T00:00:00Z"),
  updatedAt: new Date("2026-10-08T00:00:00Z"),
};

describe("toStudent", () => {
  it("turns a database row into the app's Student", () => {
    expect(toStudent(row)).toEqual({
      id: "student-a",
      schoolId: "school-a",
      firstName: "Juan",
      lastName: "Cruz",
      birthDate: "2013-04-09",
      lrn: "100000000001",
      gradeLevel: 7,
      section: "Rizal",
      guardianName: "Maria Cruz",
      guardianMobile: "09171234567",
    });
  });

  it("rejects a grade outside 7 to 12", () => {
    expect(() => toStudent({ ...row, gradeLevel: 6 })).toThrow();
  });
});

describe("toStudentData", () => {
  const student: Student = {
    id: "student-a",
    schoolId: "school-a",
    firstName: "Juan",
    lastName: "Cruz",
    birthDate: "2013-04-09",
    gradeLevel: 7,
    section: "Rizal",
    guardianName: "Maria Cruz",
    guardianMobile: "09171234567",
  };

  it("stores the birth date as midnight UTC, so the database keeps the same day", () => {
    expect(toStudentData(student).birthDate.toISOString()).toBe("2013-04-09T00:00:00.000Z");
  });

  it("stores a missing LRN and middle name as null", () => {
    expect(toStudentData(student)).toMatchObject({ lrn: null, middleName: null, photoUrl: null });
  });

  it("round-trips: a student saved and read back is the same student", () => {
    const saved = { ...row, ...toStudentData(student), id: student.id };
    expect(toStudent(saved)).toEqual(student);
  });
});
