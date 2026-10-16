import { describe, expect, it } from "vitest";
import { schoolDayFor } from "@/features/attendance/status";
import type { Tap } from "@/features/attendance/types";
import type { School } from "@/features/schools/types";
import type { Student } from "@/features/students/types";
import { schoolTimeToIso } from "@/lib/school-time";
import {
  apiError,
  toChildTodayJson,
  toDayTapsJson,
  toNotificationJson,
  toParentJson,
  toSchoolJson,
} from "./api-responses";

const FRIDAY = "2026-06-19";

const school: School = {
  id: "school-a",
  name: "School A",
  theme: { kind: "preset", presetId: "school" },
  showDepedLogo: false,
  notificationPreference: "time_in_only",
  lateAfter: "08:05",
  absentFrom: "09:00",
};

const student: Student = {
  id: "student-juan",
  schoolId: "school-a",
  firstName: "Juan",
  lastName: "Dela Cruz",
  birthDate: "2012-03-14",
  lrn: "100000000123",
  gradeLevel: 8,
  section: "Rizal",
  guardianName: "Maria Dela Cruz",
  guardianMobile: "09171234567",
  photoKey: "school-a/student-juan/k3x9q2ab.webp",
};

function tap(n: number, time: string): Tap {
  return {
    id: `00000000-0000-4000-8000-00000000000${n}`,
    schoolId: "school-a",
    stationId: "gate",
    cardSerial: "04:A3:5F:2B:91:C0:80",
    studentId: student.id,
    tappedAt: schoolTimeToIso(FRIDAY, time),
  };
}

const day = schoolDayFor(FRIDAY, schoolTimeToIso(FRIDAY, "17:00"), school);
const taps = [tap(1, "07:56"), tap(2, "16:05")];

/** What must never reach a phone (CLAUDE.md: students are minors). */
const PRIVATE = [student.lrn!, student.birthDate, student.guardianName, student.guardianMobile];

describe("parent API answers", () => {
  it("gives a child's day with exactly the agreed keys, times on the school's clock", () => {
    const json = toChildTodayJson({ student, school, day, todayTaps: taps, recentTaps: [] });
    expect(json).toEqual({
      id: "student-juan",
      firstName: "Juan",
      lastName: "Dela Cruz",
      gradeLevel: 8,
      section: "Rizal",
      photo: "/api/v1/photos/school-a/student-juan/k3x9q2ab.webp",
      school: { id: "school-a", name: "School A", notificationPreference: "time_in_only" },
      today: {
        date: FRIDAY,
        status: "present",
        flexible: false,
        timeIn: `${FRIDAY}T07:56:00.000+08:00`,
        timeOut: `${FRIDAY}T16:05:00.000+08:00`,
        tapCount: 2,
      },
    });
    for (const secret of PRIVATE) expect(JSON.stringify(json)).not.toContain(secret);
  });

  it("gives a day's taps labelled in and out", () => {
    expect(toDayTapsJson(student.id, taps, day)).toEqual({
      date: FRIDAY,
      status: "present",
      flexible: false,
      taps: [
        { at: `${FRIDAY}T07:56:00.000+08:00`, kind: "time_in" },
        { at: `${FRIDAY}T16:05:00.000+08:00`, kind: "time_out" },
      ],
    });
  });

  it("copies only the agreed keys of a parent and a school", () => {
    const parent = { id: "p", firstName: "Ana", lastName: "Reyes", email: "ana@x.com", mobile: "09170000000" };
    expect(Object.keys(toParentJson({ ...parent, extra: "no" } as typeof parent))).toEqual([
      "id",
      "firstName",
      "lastName",
      "email",
      "mobile",
    ]);
    expect(toSchoolJson(school)).toEqual({ id: "school-a", name: "School A" });
  });

  it("gives a feed entry with exactly the agreed keys, and only the child's name", () => {
    const json = toNotificationJson({
      notification: {
        id: "00000000-0000-4000-8000-000000000001",
        schoolId: "school-a",
        studentId: student.id,
        kind: "time_in",
        tappedAt: schoolTimeToIso(FRIDAY, "07:56"),
        read: false,
      },
      // Spread on purpose: a whole student must still come out as just the name.
      student: { ...student },
    });
    expect(json).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      childId: "student-juan",
      childName: "Juan Dela Cruz",
      kind: "time_in",
      at: `${FRIDAY}T07:56:00.000+08:00`,
      read: false,
    });
    for (const secret of PRIVATE) expect(JSON.stringify(json)).not.toContain(secret);
  });

  it("answers every error in one shape, with its status", async () => {
    const response = apiError("conflict", "Already linked.");
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: { code: "conflict", message: "Already linked." } });
    await expect(apiError("invalid_input", "Check.", { email: "Bad" }).json()).resolves.toEqual({
      error: { code: "invalid_input", message: "Check.", fields: { email: "Bad" } },
    });
  });
});
