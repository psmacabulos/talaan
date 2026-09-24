import { describe, expect, it } from "vitest";
import { alertSchema, tapSchema } from "@/features/attendance/schemas";
import {
  notificationSchema,
  parentSchema,
  parentStudentLinkSchema,
} from "@/features/parents/schemas";
import { schoolSchema } from "@/features/schools/schemas";
import { staffSchema } from "@/features/staff/schemas";
import { cardSchema, studentSchema } from "@/features/students/schemas";
import {
  seedAlerts,
  seedCards,
  seedNotifications,
  seedParents,
  seedParentStudentLinks,
  seedSchools,
  seedStaff,
  seedStudents,
  seedTaps,
} from "./index";

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

  it("every parent is valid", () => {
    for (const parent of seedParents) {
      expect(parentSchema.safeParse(parent).success, `parent ${parent.id}`).toBe(true);
    }
  });

  it("every parent-student link is valid", () => {
    for (const link of seedParentStudentLinks) {
      expect(
        parentStudentLinkSchema.safeParse(link).success,
        `link ${link.id}`,
      ).toBe(true);
    }
  });

  it("every notification is valid", () => {
    for (const notification of seedNotifications) {
      expect(
        notificationSchema.safeParse(notification).success,
        `notification ${notification.id}`,
      ).toBe(true);
    }
  });
});

describe("seed data shape", () => {
  it("has 3 schools, 7 staff and 76 students (72-student roster plus a spare batch for e2e)", () => {
    expect(seedSchools).toHaveLength(3);
    expect(seedStaff).toHaveLength(7);
    expect(seedStudents).toHaveLength(76);
  });

  it("gives every student a unique full name within their own school", () => {
    // Only within-school needs to hold: every screen that lists or searches
    // students is scoped to one school (a student's own name-generation
    // period repeats globally past 40 students, so cross-school duplicates
    // do happen — e.g. student-0001 and student-0041 are both "Juan Cruz").
    // e2e\students.spec.ts searches Balanga by name, and parent.spec.ts
    // looks a tapped Balanga student up by name, so a same-school duplicate
    // would make either ambiguous.
    const namesBySchool = new Map<string, string[]>();
    for (const student of seedStudents) {
      const names = namesBySchool.get(student.schoolId) ?? [];
      names.push(`${student.firstName} ${student.lastName}`);
      namesBySchool.set(student.schoolId, names);
    }
    for (const [schoolId, names] of namesBySchool) {
      expect(new Set(names).size, schoolId).toBe(names.length);
    }
  });

  it("spreads students across grades 7-12 and 12 sections", () => {
    const gradeLevels = new Set(seedStudents.map((s) => s.gradeLevel));
    expect(gradeLevels).toEqual(new Set([7, 8, 9, 10, 11, 12]));

    // Still 12 — students.ts's spare batch joins an existing section
    // (Rizal) rather than adding a 13th.
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

  it("gives every parent a schoolId matching a real seed school", () => {
    const schoolIds = new Set(seedSchools.map((s) => s.id));
    for (const parent of seedParents) {
      expect(schoolIds.has(parent.schoolId), `parent ${parent.id}`).toBe(true);
    }
  });

  it("links every parent and student to a real record at the same school", () => {
    const parentById = new Map(seedParents.map((p) => [p.id, p]));
    const studentById = new Map(seedStudents.map((s) => [s.id, s]));
    for (const link of seedParentStudentLinks) {
      const parent = parentById.get(link.parentId);
      const student = studentById.get(link.studentId);
      expect(parent, `link ${link.id} parent`).toBeDefined();
      expect(student, `link ${link.id} student`).toBeDefined();
      expect(link.schoolId, `link ${link.id} school`).toBe(parent?.schoolId);
      expect(link.schoolId, `link ${link.id} school`).toBe(student?.schoolId);
    }
  });

  it("notifications reference a real student at a matching school", () => {
    const studentById = new Map(seedStudents.map((s) => [s.id, s]));
    for (const notification of seedNotifications) {
      const student = studentById.get(notification.studentId);
      expect(student, `notification ${notification.id} student`).toBeDefined();
      expect(notification.schoolId, `notification ${notification.id} school`).toBe(
        student?.schoolId,
      );
    }
  });

  it("demonstrates both directions of the parent-student many-to-many", () => {
    // one parent, several children
    const childrenOfBalanga1 = seedParentStudentLinks.filter((l) => l.parentId === "parent-balanga-1");
    expect(childrenOfBalanga1.length).toBeGreaterThan(1);
    // one child, several guardians
    const guardiansOfStudent1 = seedParentStudentLinks.filter((l) => l.studentId === "student-0001");
    expect(guardiansOfStudent1.length).toBeGreaterThan(1);
  });
});
