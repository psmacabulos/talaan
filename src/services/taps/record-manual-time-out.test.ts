import { describe, expect, it } from "vitest";
import type { TapWrite } from "@/data/repositories";
import { tapSchema } from "@/features/attendance/schemas";
import type { Tap } from "@/features/attendance/types";
import type { NotificationPreference, School } from "@/features/schools/types";
import type { Card, Student } from "@/features/students/types";
import { MANUAL_STATION_ID, manualTimeInId, type ManualTapStaff, type ManualTimeInDeps } from "./record-manual-time-in";
import { manualTimeOutId, recordManualTimeOut } from "./record-manual-time-out";

const NOW = "2026-06-19T08:00:00.000Z"; // 4:00 PM at the school
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

/** Today's taps at these school times, earliest first, as the repository returns them. */
function tapsAt(...utcTimes: string[]): Tap[] {
  return utcTimes.map((tappedAt, index) =>
    tapSchema.parse({
      id: `00000000-0000-4000-8000-00000000000${index + 1}`,
      schoolId: "school-a",
      stationId: "device-gate",
      cardSerial: card.serial,
      studentId: "student-a",
      tappedAt,
    }),
  );
}

const IN_710 = "2026-06-18T23:10:00.000Z"; // 7:10 AM
const OUT_1200 = "2026-06-19T04:00:00.000Z"; // 12:00 PM
const BACK_1300 = "2026-06-19T05:00:00.000Z"; // 1:00 PM

function fakeDeps(
  options: {
    taps?: Tap[];
    card?: Card | null;
    preference?: NotificationPreference;
    written?: "created" | "exists" | "duplicate";
  } = {},
) {
  const writes: TapWrite[] = [];
  const deps: ManualTimeInDeps = {
    students: {
      getInSchool: async (schoolId, id) => (schoolId === student.schoolId && id === student.id ? student : null),
    },
    taps: { listByStudentOnDate: async () => options.taps ?? tapsAt(IN_710) },
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

describe("recordManualTimeOut (Step 59.4)", () => {
  it("records a time out now, by hand, with who did it and the student's card serial", async () => {
    const { deps, writes } = fakeDeps();
    const result = await recordManualTimeOut(input, deps);

    expect(result).toMatchObject({ outcome: "recorded", direction: "time_out", notified: true, replayed: false });
    expect(writes).toHaveLength(1);
    expect(writes[0].tap).toEqual({
      id: manualTimeOutId("student-a", TODAY, 1),
      schoolId: "school-a",
      stationId: MANUAL_STATION_ID,
      cardSerial: card.serial,
      studentId: "student-a",
      tappedAt: NOW,
      source: "manual",
      recordedById: "staff-principal",
    });
    expect(writes[0].deviceId).toBeNull();
    expect(writes[0].notification).toMatchObject({ studentId: "student-a", kind: "time_out", tappedAt: NOW });
  });

  it("refuses a student with no time in today, and writes nothing", async () => {
    const { deps, writes } = fakeDeps({ taps: [] });
    await expect(recordManualTimeOut(input, deps)).resolves.toMatchObject({ outcome: "no_time_in" });
    expect(writes).toHaveLength(0);
  });

  it("refuses a student who is already out, and writes nothing", async () => {
    const { deps, writes } = fakeDeps({ taps: tapsAt(IN_710, OUT_1200) });
    await expect(recordManualTimeOut(input, deps)).resolves.toMatchObject({ outcome: "already_out" });
    expect(writes).toHaveLength(0);
  });

  it("records a time out after a card's tap back in, with its own id", async () => {
    const { deps, writes } = fakeDeps({ taps: tapsAt(IN_710, OUT_1200, BACK_1300) });
    await expect(recordManualTimeOut(input, deps)).resolves.toMatchObject({ outcome: "recorded" });
    expect(writes[0].tap.id).toBe(manualTimeOutId("student-a", TODAY, 3));
  });

  it("lets a teacher record their own class, and nobody else's", async () => {
    await expect(recordManualTimeOut({ ...input, staff: ownTeacher }, fakeDeps().deps)).resolves.toMatchObject({
      outcome: "recorded",
    });

    const { deps, writes } = fakeDeps();
    await expect(recordManualTimeOut({ ...input, staff: otherTeacher }, deps)).resolves.toEqual({
      outcome: "not_found",
    });
    expect(writes).toHaveLength(0);
  });

  it("never records a student at another school", async () => {
    const { deps, writes } = fakeDeps();
    await expect(recordManualTimeOut({ ...input, schoolId: "school-b" }, deps)).resolves.toEqual({
      outcome: "not_found",
    });
    expect(writes).toHaveLength(0);
  });

  it("locks the card from the last tap to the school's midnight, so a gate read in between isn't doubled (Step 56)", async () => {
    const { deps, writes } = fakeDeps({ taps: tapsAt(IN_710, OUT_1200, BACK_1300) });
    await recordManualTimeOut(input, deps);
    expect(writes[0].duplicateWindow).toEqual({ from: BACK_1300, to: "2026-06-19T16:00:00.000Z" });
  });

  it("checks no window for a student with no card, and saves no serial", async () => {
    const { deps, writes } = fakeDeps({ card: null });
    await recordManualTimeOut(input, deps);
    expect(writes[0].duplicateWindow).toBeNull();
    expect(writes[0].tap.cardSerial).toBeNull();
  });

  it("answers 'already out' when another click or a gate read got there first", async () => {
    for (const written of ["exists", "duplicate"] as const) {
      const { deps } = fakeDeps({ written });
      await expect(recordManualTimeOut(input, deps)).resolves.toMatchObject({ outcome: "already_out" });
    }
  });

  it("sends no notification unless the school tells parents about time outs", async () => {
    for (const preference of ["off", "time_in_only"] as const) {
      const { deps, writes } = fakeDeps({ preference });
      await expect(recordManualTimeOut(input, deps)).resolves.toMatchObject({ outcome: "recorded", notified: false });
      expect(writes[0].notification).toBeNull();
    }
  });
});

describe("manualTimeOutId", () => {
  it("is the same for one student, day and tap count, and a valid UUID", () => {
    const id = manualTimeOutId("student-a", TODAY, 1);
    expect(manualTimeOutId("student-a", TODAY, 1)).toBe(id);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("differs by tap count, day and student, and never matches the time in's id", () => {
    const id = manualTimeOutId("student-a", TODAY, 1);
    expect(manualTimeOutId("student-a", TODAY, 3)).not.toBe(id);
    expect(manualTimeOutId("student-a", "2026-06-20", 1)).not.toBe(id);
    expect(manualTimeOutId("student-b", TODAY, 1)).not.toBe(id);
    expect(manualTimeInId("student-a", TODAY)).not.toBe(id);
  });
});
