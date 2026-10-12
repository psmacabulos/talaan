import { describe, expect, it, vi } from "vitest";
import type { Tap } from "@/features/attendance/types";
import type { Session } from "@/lib/session";
import type { ParentSession } from "@/lib/parent-session";
import { seedCards, seedNotifications, seedStaff, seedStudents } from "@/data/seed";

/**
 * Step 51: every action, called by Oceanview with Balanga's ids, must
 * answer "not found" (or refuse) and leave Balanga's data untouched. The
 * session and the repositories are swapped for in-memory ones filled with
 * the demo seed, so this runs without a database.
 */
const state = vi.hoisted(() => ({
  session: null as Session | null,
  parentSession: null as ParentSession | null,
}));

vi.mock("@/lib/session", () => ({
  getSession: async () => state.session,
  requireSession: async () => state.session,
  startStaffSession: vi.fn(),
}));
vi.mock("@/lib/parent-session", () => ({ getParentSession: async () => state.parentSession }));
vi.mock("@/lib/env", () => ({ sessionSecret: () => "isolation-test-secret-0123456789-0123456789" }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ origin: "http://localhost:3000" }) }));
vi.mock("@/data/repositories", async () => {
  const seed = await import("@/data/seed");
  const copy = <T,>(rows: T[]): T[] => structuredClone(rows);
  const options = { latencyMs: 0 };
  const { createMockStudentRepository } = await import("@/data/repositories/student-repository");
  const { createMockStaffRepository } = await import("@/data/repositories/staff-repository");
  const { createMockCardRepository } = await import("@/data/repositories/card-repository");
  const { createMockTapRepository } = await import("@/data/repositories/tap-repository");
  const { createMockNotificationRepository } = await import("@/data/repositories/notification-repository");
  const { createMockParentStudentLinkRepository } = await import("@/data/repositories/parent-student-link-repository");
  const { createMockSchoolRepository } = await import("@/data/repositories/school-repository");
  const { createMockAlertRepository } = await import("@/data/repositories/alert-repository");
  return {
    studentRepository: createMockStudentRepository(copy(seed.seedStudents), options),
    staffRepository: createMockStaffRepository(copy(seed.seedStaff), options),
    cardRepository: createMockCardRepository(copy(seed.seedCards), options),
    tapRepository: createMockTapRepository(copy(seed.seedTaps), options),
    notificationRepository: createMockNotificationRepository(copy(seed.seedNotifications), options),
    parentStudentLinkRepository: createMockParentStudentLinkRepository(copy(seed.seedParentStudentLinks), options),
    schoolRepository: createMockSchoolRepository(copy(seed.seedSchools), options),
    alertRepository: createMockAlertRepository(copy(seed.seedAlerts), options),
  };
});

const { studentRepository, staffRepository, tapRepository, notificationRepository } = await import(
  "@/data/repositories"
);
const { updateStudent } = await import("@/features/students/actions");
const { checkCardSerial } = await import("@/features/students/card-actions");
const { removeStaff, createSignInLink } = await import("@/features/staff/actions");
const { syncStationTaps } = await import("@/features/station/station-actions");
const { markNotificationRead } = await import("@/features/parents/notification-actions");

const OCEANVIEW = "school-oceanview";
const BALANGA = "school-balanga";
const oceanviewPrincipal: Session = { userId: `staff-principal-${OCEANVIEW}`, role: "principal", schoolId: OCEANVIEW };

const balangaStudent = seedStudents.find((student) => student.schoolId === BALANGA)!;
const balangaTeacher = seedStaff.find((staff) => staff.id === `staff-teacher-${BALANGA}`)!;
const balangaCard = seedCards.find((card) => card.schoolId === BALANGA && card.status === "active")!;
const balangaUnread = seedNotifications.find((n) => n.schoolId === BALANGA && !n.read)!;

function signInAsOceanview() {
  state.session = oceanviewPrincipal;
}

describe("Oceanview can't reach Balanga's data (Step 51)", () => {
  it("can't edit a Balanga student", async () => {
    signInAsOceanview();
    // Refused before the form is even read, so the student's own fields will do.
    const input = { ...balangaStudent, firstName: "Changed" } as unknown as Parameters<typeof updateStudent>[1];
    const result = await updateStudent(balangaStudent.id, input);
    expect(result).toEqual({ ok: false, formError: "That student could not be found." });
    await expect(studentRepository.getInSchool(BALANGA, balangaStudent.id)).resolves.toMatchObject({
      firstName: balangaStudent.firstName,
    });
  });

  it("can't remove a Balanga staff member, or make them a sign-in link", async () => {
    signInAsOceanview();
    const notFound = { ok: false, error: "That staff member no longer exists." };
    await expect(removeStaff(balangaTeacher.id)).resolves.toEqual(notFound);
    await expect(createSignInLink(balangaTeacher.id)).resolves.toEqual(notFound);
    await expect(staffRepository.getInSchool(BALANGA, balangaTeacher.id)).resolves.not.toBeNull();
  });

  it("can't link a card that's already Balanga's, and learns nothing about whose it is", async () => {
    signInAsOceanview();
    const result = await checkCardSerial(balangaCard.serial);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(balangaStudent.lastName);
  });

  it("can't write a tap into Balanga's day through the tap station", async () => {
    signInAsOceanview();
    const before = await tapRepository.listByStudent(BALANGA, balangaStudent.id);
    const forged = (schoolId: string): Tap => ({
      id: crypto.randomUUID(),
      schoolId,
      stationId: "station-forged",
      cardSerial: balangaCard.serial,
      studentId: balangaStudent.id,
      tappedAt: "2026-06-19T08:00:00.000Z",
    });
    const result = await syncStationTaps([
      // Claiming to be Balanga's tap.
      { status: "recorded", kind: "valid", tap: forged(BALANGA), studentName: "x", gradeSection: "x" },
      // Oceanview's own tap, but naming a Balanga student.
      { status: "recorded", kind: "valid", tap: forged(OCEANVIEW), studentName: "x", gradeSection: "x" },
    ]);
    expect(result).toEqual({ synced: 0 });
    await expect(tapRepository.listByStudent(BALANGA, balangaStudent.id)).resolves.toEqual(before);
  });

  it("a parent can't mark another school's notification read", async () => {
    state.parentSession = { parentId: "parent-oceanview-1", schoolId: OCEANVIEW };
    await expect(markNotificationRead(balangaUnread.id)).resolves.toEqual({
      ok: false,
      formError: "That notification no longer exists.",
    });
    await expect(notificationRepository.getInSchool(BALANGA, balangaUnread.id)).resolves.toMatchObject({ read: false });
  });
});
