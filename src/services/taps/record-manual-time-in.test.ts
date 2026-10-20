import { describe, expect, it } from "vitest";
import type { TapWrite } from "@/data/repositories";
import { tapSchema } from "@/features/attendance/schemas";
import type { Tap } from "@/features/attendance/types";
import type { NotificationPreference, School } from "@/features/schools/types";
import type { Card, Student } from "@/features/students/types";
import {
  MANUAL_STATION_ID,
  manualTimeInId,
  recordManualTimeIn,
  type ManualTapStaff,
  type ManualTimeInDeps,
} from "./record-manual-time-in";

const NOW = "2026-06-19T01:10:00.000Z"; // 9:10 AM at the school
const TODAY = "2026-06-19";

const student: Student = {
  id: "student-a",
  schoolId: "school-a",
  firstName: "Juan",
  lastName: "Cruz",
  birthDate: "2013-04-02",
  gradeLevel: 7,
  section: "Rizal",
  guardianName: "Rosa Cruz",
  guardianMobile: "09170000001",
};

const card: Card = {
  id: "card-a",
  schoolId: "school-a",
  studentId: "student-a",
  serial: "04:A3:5F:2B:91:C0:80",
  status: "active",
  linkedAt: "2026-06-01T08:00:00Z",
};

const principal: ManualTapStaff = { id: "staff-principal", role: "principal" };
const ownTeacher: ManualTapStaff = {
  id: "staff-teacher",
  role: "teacher",
  advisoryGradeLevel: 7,
  advisorySection: "Rizal",
};
const otherTeacher: ManualTapStaff = {
  id: "staff-other",
  role: "teacher",
  advisoryGradeLevel: 8,
  advisorySection: "Bonifacio",
};

function fakeDeps(
  options: {
    taps?: Tap[];
    card?: Card | null;
    preference?: NotificationPreference;
    written?: "created" | "exists";
  } = {},
) {
  const writes: TapWrite[] = [];
  const deps: ManualTimeInDeps = {
    students: {
      getInSchool: async (schoolId, id) => (schoolId === student.schoolId && id === student.id ? student : null),
    },
    taps: { listByStudentOnDate: async () => options.taps ?? [] },
    cards: { getActiveForStudent: async () => (options.card === undefined ? card : options.card) },
    schools: {
      getById: async () =>
        ({ id: "school-a", notificationPreference: options.preference ?? "time_in_and_time_out" }) as School,
    },
    writer: {
      record: async (write) => {
        writes.push(write);
        return options.written ?? "created";
      },
    },
  };
  return { deps, writes };
}

const input = { schoolId: "school-a", studentId: "student-a", staff: principal, now: NOW };

describe("recordManualTimeIn (Step 55)", () => {
  it("records a time in now, by hand, with who did it and the student's card serial", async () => {
    const { deps, writes } = fakeDeps();
    const result = await recordManualTimeIn(input, deps);

    expect(result).toMatchObject({ outcome: "recorded", direction: "time_in", notified: true, replayed: false });
    expect(writes).toHaveLength(1);
    expect(writes[0].tap).toEqual({
      id: manualTimeInId("student-a", TODAY),
      schoolId: "school-a",
      stationId: MANUAL_STATION_ID,
      cardSerial: card.serial,
      studentId: "student-a",
      tappedAt: NOW,
      source: "manual",
      recordedById: "staff-principal",
    });
    expect(writes[0].deviceId).toBeNull();
    expect(writes[0].notification).toMatchObject({ studentId: "student-a", kind: "time_in", tappedAt: NOW });
  });

  it("records a student with no card, with no serial", async () => {
    const { deps, writes } = fakeDeps({ card: null });
    await expect(recordManualTimeIn(input, deps)).resolves.toMatchObject({ outcome: "recorded" });
    expect(writes[0].tap.cardSerial).toBeNull();
  });

  it("lets a teacher record their own class, and nobody else's", async () => {
    await expect(recordManualTimeIn({ ...input, staff: ownTeacher }, fakeDeps().deps)).resolves.toMatchObject({
      outcome: "recorded",
    });

    const { deps, writes } = fakeDeps();
    await expect(recordManualTimeIn({ ...input, staff: otherTeacher }, deps)).resolves.toEqual({
      outcome: "not_found",
    });
    expect(writes).toHaveLength(0);
  });

  it("never records a student at another school", async () => {
    const { deps, writes } = fakeDeps();
    await expect(recordManualTimeIn({ ...input, schoolId: "school-b" }, deps)).resolves.toEqual({
      outcome: "not_found",
    });
    expect(writes).toHaveLength(0);
  });

  it("refuses a student who already tapped today, and writes nothing", async () => {
    const gateTap = tapSchema.parse({
      id: "00000000-0000-4000-8000-000000000001",
      schoolId: "school-a",
      stationId: "device-gate",
      cardSerial: card.serial,
      studentId: "student-a",
      tappedAt: "2026-06-18T23:56:00.000Z",
    });
    const { deps, writes } = fakeDeps({ taps: [gateTap] });
    await expect(recordManualTimeIn(input, deps)).resolves.toMatchObject({ outcome: "already_tapped" });
    expect(writes).toHaveLength(0);
  });

  it("answers 'already tapped' when another click got there first", async () => {
    const { deps } = fakeDeps({ written: "exists" });
    await expect(recordManualTimeIn(input, deps)).resolves.toMatchObject({ outcome: "already_tapped" });
  });

  it("sends no notification when the school's setting is off", async () => {
    const { deps, writes } = fakeDeps({ preference: "off" });
    await expect(recordManualTimeIn(input, deps)).resolves.toMatchObject({ outcome: "recorded", notified: false });
    expect(writes[0].notification).toBeNull();
  });
});

describe("manualTimeInId", () => {
  it("is the same for one student on one day, and a valid UUID", () => {
    const id = manualTimeInId("student-a", TODAY);
    expect(manualTimeInId("student-a", TODAY)).toBe(id);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("differs for another day or another student", () => {
    const id = manualTimeInId("student-a", TODAY);
    expect(manualTimeInId("student-a", "2026-06-20")).not.toBe(id);
    expect(manualTimeInId("student-b", TODAY)).not.toBe(id);
  });
});
