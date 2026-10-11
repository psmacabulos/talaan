import { describe, expect, it } from "vitest";
import type { Card, Student } from "@/features/students/types";
import { buildGateRoster, rosterETag } from "./roster";

function student(id: string): Student {
  return {
    id,
    schoolId: "school-a",
    firstName: "Juan",
    lastName: id,
    birthDate: "2012-01-01",
    lrn: "100000000001",
    gradeLevel: 7,
    section: "Rizal",
    guardianName: "Maria",
    guardianMobile: "09171234567",
  };
}

function card(serial: string, studentId: string, status: Card["status"]): Card {
  return {
    id: `card-${serial}`,
    schoolId: "school-a",
    studentId,
    serial,
    status,
    linkedAt: "2026-06-01T00:00:00.000Z",
  };
}

describe("buildGateRoster", () => {
  const roster = buildGateRoster(
    [card("04:BB", "s1", "active"), card("04:AA", "s1", "lost"), card("04:CC", "s2", "retired")],
    [{ ...student("s1"), photoKey: "school-a/s1/k3x9q2ab.webp" }, student("s2"), student("s3")],
  );

  it("lists only active cards", () => {
    expect(roster.cards).toEqual([{ serial: "04:BB", studentId: "s1" }]);
  });

  it("lists each student with an active card once, with nothing personal", () => {
    expect(roster.students).toHaveLength(1);
    expect(Object.keys(roster.students[0]).sort()).toEqual([
      "firstName",
      "gradeLevel",
      "id",
      "lastName",
      "photo",
      "section",
    ]);
  });

  it("gives each student the address of their photo, or null", () => {
    expect(roster.students[0].photo).toBe("/api/v1/photos/school-a/s1/k3x9q2ab.webp");
    const withoutPhoto = buildGateRoster([card("04:DD", "s2", "active")], [student("s2")]);
    expect(withoutPhoto.students[0].photo).toBeNull();
  });
});

describe("rosterETag", () => {
  it("is the same for the same roster and different for a changed one", () => {
    expect(rosterETag("a")).toBe(rosterETag("a"));
    expect(rosterETag("a")).not.toBe(rosterETag("b"));
    expect(rosterETag("a")).toMatch(/^"[\w-]+"$/);
  });
});
