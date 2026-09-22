import { describe, expect, it } from "vitest";
import type { Student } from "@/features/students/types";
import {
  ATTENDANCE_SEED_DATE,
  attendanceHref,
  classOptionsFromRoster,
  formatAttendanceDateLabel,
  parseAttendanceDate,
  resolveClassSelection,
  type ClassOption,
} from "./attendance-search-params";

const SCHOOL_ID = "school-test";

function student(overrides: Partial<Student> & Pick<Student, "id" | "gradeLevel" | "section">): Student {
  return {
    schoolId: SCHOOL_ID,
    firstName: "Ana",
    lastName: "Cruz",
    birthDate: "2012-01-01",
    guardianName: "Ana's guardian",
    guardianMobile: "09171234567",
    ...overrides,
  };
}

describe("parseAttendanceDate", () => {
  it("defaults to the seed date when no date is given", () => {
    expect(parseAttendanceDate(undefined)).toBe(ATTENDANCE_SEED_DATE);
  });

  it("accepts a plain YYYY-MM-DD date", () => {
    expect(parseAttendanceDate("2026-01-15")).toBe("2026-01-15");
  });

  it("falls back to the seed date on garbage instead of throwing", () => {
    expect(parseAttendanceDate("not-a-date")).toBe(ATTENDANCE_SEED_DATE);
    expect(parseAttendanceDate("2026-1-1")).toBe(ATTENDANCE_SEED_DATE);
  });

  it("takes the first value when the param repeats in the URL", () => {
    expect(parseAttendanceDate(["2026-01-15", "2026-01-16"])).toBe("2026-01-15");
  });
});

describe("classOptionsFromRoster", () => {
  it("returns one option per distinct grade/section, sorted by grade then section", () => {
    const options = classOptionsFromRoster([
      student({ id: "s1", gradeLevel: 9, section: "Mabini" }),
      student({ id: "s2", gradeLevel: 8, section: "Rizal" }),
      student({ id: "s3", gradeLevel: 8, section: "Rizal" }),
      student({ id: "s4", gradeLevel: 8, section: "Bonifacio" }),
    ]);
    expect(options).toEqual([
      { gradeLevel: 8, section: "Bonifacio" },
      { gradeLevel: 8, section: "Rizal" },
      { gradeLevel: 9, section: "Mabini" },
    ]);
  });

  it("returns an empty list for an empty roster", () => {
    expect(classOptionsFromRoster([])).toEqual([]);
  });
});

describe("resolveClassSelection", () => {
  const options: ClassOption[] = [
    { gradeLevel: 8, section: "Bonifacio" },
    { gradeLevel: 8, section: "Rizal" },
    { gradeLevel: 9, section: "Mabini" },
  ];

  it("resolves a requested grade/section that actually exists", () => {
    expect(resolveClassSelection("8", "Rizal", options)).toEqual({ gradeLevel: 8, section: "Rizal" });
  });

  it("falls back to the first section of the requested grade when the section doesn't exist", () => {
    expect(resolveClassSelection("8", "Not-A-Real-Section", options)).toEqual({ gradeLevel: 8, section: "Bonifacio" });
  });

  it("falls back to the first option entirely when the grade doesn't exist", () => {
    expect(resolveClassSelection("12", "Anything", options)).toEqual({ gradeLevel: 8, section: "Bonifacio" });
  });

  it("falls back to the first option when nothing is requested", () => {
    expect(resolveClassSelection(undefined, undefined, options)).toEqual({ gradeLevel: 8, section: "Bonifacio" });
  });

  it("returns undefined when there are no classes at all", () => {
    expect(resolveClassSelection("8", "Rizal", [])).toBeUndefined();
  });

  it("always returns lockedTo when given, ignoring the requested grade/section entirely", () => {
    const lockedTo: ClassOption = { gradeLevel: 9, section: "Mabini" };
    expect(resolveClassSelection("8", "Rizal", options, lockedTo)).toEqual(lockedTo);
  });
});

describe("attendanceHref", () => {
  it("writes date, grade and section as query params", () => {
    expect(attendanceHref({ date: "2026-06-20", gradeLevel: 8, section: "Rizal" })).toBe(
      "/attendance?date=2026-06-20&grade=8&section=Rizal",
    );
  });
});

describe("formatAttendanceDateLabel", () => {
  it("formats a plain date as a readable label", () => {
    expect(formatAttendanceDateLabel("2026-06-20")).toBe("June 20, 2026");
  });
});
