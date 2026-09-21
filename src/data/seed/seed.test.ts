import { describe, expect, it } from "vitest";
import { alertSchema, tapSchema } from "@/features/attendance/schemas";
import { schoolSchema } from "@/features/schools/schemas";
import { staffSchema } from "@/features/staff/schemas";
import { cardSchema, studentSchema } from "@/features/students/schemas";
import { seedAlerts, seedCards, seedSchools, seedStaff, seedStudents, seedTaps } from "./index";

/**
 * Every seed record must actually satisfy its own domain schema — this is
 * what Step 9's mock repositories will hand straight to UI code, so if the
 * seed data itself were invalid, everything built on top of it would be too.
 */
describe("seed data matches its own schemas", () => {
  it("every school is valid", () => {
    for (const school of seedSchools) {
      expect(schoolSchema.safeParse(school).success, `school ${school.id}`).toBe(true);
    }
  });

  it("every staff member is valid", () => {
    for (const staff of seedStaff) {
      expect(staffSchema.safeParse(staff).success, `staff ${staff.id}`).toBe(true);
    }
  });

  it("every student is valid", () => {
    for (const student of seedStudents) {
      expect(studentSchema.safeParse(student).success, `student ${student.id}`).toBe(true);
    }
  });

  it("every card is valid", () => {
    for (const card of seedCards) {
      expect(cardSchema.safeParse(card).success, `card ${card.id}`).toBe(true);
    }
  });

  it("every tap is valid", () => {
    for (const tap of seedTaps) {
      expect(tapSchema.safeParse(tap).success, `tap ${tap.id}`).toBe(true);
    }
  });

  it("every alert is valid", () => {
    for (const alert of seedAlerts) {
      expect(alertSchema.safeParse(alert).success, `alert ${alert.id}`).toBe(true);
    }
  });
});

describe("seed data shape", () => {
  it("has 3 schools, 7 staff and 72 students", () => {
    expect(seedSchools).toHaveLength(3);
    expect(seedStaff).toHaveLength(7);
    expect(seedStudents).toHaveLength(72);
  });

  it("spreads students across grades 7-12 and 12 sections", () => {
    const gradeLevels = new Set(seedStudents.map((s) => s.gradeLevel));
    expect(gradeLevels).toEqual(new Set([7, 8, 9, 10, 11, 12]));

    const sections = new Set(seedStudents.map((s) => `${s.schoolId}/${s.gradeLevel}/${s.section}`));
    expect(sections.size).toBe(12);
  });

  it("gives every record a schoolId that matches a real seed school", () => {
    const schoolIds = new Set(seedSchools.map((s) => s.id));
    for (const student of seedStudents) {
      expect(schoolIds.has(student.schoolId), `student ${student.id}`).toBe(true);
    }
    for (const staff of seedStaff) {
      if (staff.schoolId !== null) {
        expect(schoolIds.has(staff.schoolId), `staff ${staff.id}`).toBe(true);
      }
    }
  });

  it("has exactly one super admin, with no school", () => {
    const superAdmins = seedStaff.filter((s) => s.role === "super_admin");
    expect(superAdmins).toHaveLength(1);
    expect(superAdmins[0].schoolId).toBeNull();
  });

  it("never has more than one active card per student", () => {
    const activeCardsByStudent = new Map<string, number>();
    for (const card of seedCards) {
      if (card.status !== "active") continue;
      activeCardsByStudent.set(card.studentId, (activeCardsByStudent.get(card.studentId) ?? 0) + 1);
    }
    for (const [studentId, count] of activeCardsByStudent) {
      expect(count, `student ${studentId}`).toBe(1);
    }
  });

  it("never issues the same card serial twice", () => {
    const serials = seedCards.map((c) => c.serial);
    expect(new Set(serials).size).toBe(serials.length);
  });

  it("includes at least one lost-card tap with a matching alert", () => {
    const lostCardSerials = new Set(
      seedCards.filter((c) => c.status === "lost").map((c) => c.serial),
    );
    const lostCardTap = seedTaps.find((tap) => lostCardSerials.has(tap.cardSerial));
    expect(lostCardTap).toBeDefined();

    const matchingAlert = seedAlerts.find((alert) => alert.tapId === lostCardTap?.id);
    expect(matchingAlert?.type).toBe("lost_card_tapped");
  });
});
