import { describe, expect, it, vi } from "vitest";
import type { StudentExport } from "@/features/students/privacy-export";
import type { Student } from "@/features/students/types";
import { deleteStudent, exportStudentData, type PrivacySession, type StudentPrivacyDeps } from "./student-privacy";

const principal: PrivacySession = { userId: "staff-1", role: "principal", schoolId: "school-a" };
const juan: Student = {
  id: "student-1",
  schoolId: "school-a",
  firstName: "Juan",
  lastName: "Dela Cruz",
  birthDate: "2012-03-04",
  gradeLevel: 7,
  section: "A",
  guardianName: "Maria Dela Cruz",
  guardianMobile: "09171234567",
  photoKey: "school-a/student-1/photo.webp",
};
const data: StudentExport = {
  student: juan,
  addedAt: "2026-01-05T00:00:00.000Z",
  cards: [{ serial: "04:A3:5F:2B", status: "active", linkedAt: "2026-01-05T00:00:00.000Z" }],
  taps: [{ tappedAt: "2026-06-19T00:00:00.000Z", source: "card", lostCard: false }],
  alerts: [],
  notices: [],
  linkedParents: [{ firstName: "Maria", lastName: "Dela Cruz", linkedAt: "2026-01-06T00:00:00.000Z" }],
};

function deps(overrides: Partial<StudentPrivacyDeps> = {}) {
  const result = {
    data: {
      exportOf: vi.fn(async () => data as StudentExport | null),
      deleteAll: vi.fn(async () => ({ photoKey: juan.photoKey ?? null }) as { photoKey: string | null } | null),
    },
    students: { getInSchool: vi.fn(async () => juan as Student | null) },
    photos: {
      get: vi.fn(async () => ({ bytes: new Uint8Array([1, 2, 3]), contentType: "image/webp" })),
      delete: vi.fn(async () => {}),
    },
    audit: vi.fn(async () => {}),
    now: () => "2026-06-19T02:00:00.000Z",
    ...overrides,
  };
  return result as typeof result & StudentPrivacyDeps;
}

describe("exportStudentData (Step 60.3)", () => {
  it("makes a file of the student's data with the photo, and records the download without a name", async () => {
    const d = deps();

    const result = await exportStudentData(principal, "student-1", d);

    expect(result).toMatchObject({ ok: true, fileName: "bantay-aral-dela-cruz-2026-06-19.json" });
    const file = JSON.parse((result as { body: string }).body);
    expect(file).toMatchObject({
      format: 1,
      student: { firstName: "Juan" },
      photo: "data:image/webp;base64,AQID",
      cards: [{ serial: "04:A3:5F:2B" }],
    });
    expect(d.data.exportOf).toHaveBeenCalledWith("school-a", "student-1");
    expect(d.audit).toHaveBeenCalledWith({
      schoolId: "school-a",
      actor: { id: "staff-1", role: "principal" },
      action: "student_exported",
      targetType: "student",
      targetId: "student-1",
    });
    expect(JSON.stringify(vi.mocked(d.audit).mock.calls)).not.toContain("Juan");
  });

  it("refuses a teacher, and a super admin with no school open, before reading anything", async () => {
    const d = deps();

    await expect(exportStudentData({ ...principal, role: "teacher" }, "student-1", d)).resolves.toEqual({
      ok: false,
      code: "forbidden",
    });
    await expect(
      exportStudentData({ ...principal, role: "super_admin", schoolId: null }, "student-1", d),
    ).resolves.toEqual({ ok: false, code: "forbidden" });
    expect(d.data.exportOf).not.toHaveBeenCalled();
    expect(d.audit).not.toHaveBeenCalled();
  });

  it("answers not found for another school's student, and records nothing", async () => {
    const d = deps({ data: { exportOf: vi.fn(async () => null), deleteAll: vi.fn() } });

    await expect(exportStudentData(principal, "student-9", d)).resolves.toEqual({ ok: false, code: "not_found" });
    expect(d.audit).not.toHaveBeenCalled();
  });

  it("leaves the photo out, not the whole download, when it can't be read", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const d = deps({
      photos: {
        get: vi.fn(async () => {
          throw new Error("storage down");
        }),
        delete: vi.fn(),
      },
    });

    const result = await exportStudentData(principal, "student-1", d);

    expect(JSON.parse((result as { body: string }).body).photo).toBeNull();
    expect(JSON.stringify(warn.mock.calls)).not.toContain("Juan");
    warn.mockRestore();
  });

  it("makes a safe file name from a last name with a quote in it", async () => {
    const d = deps({
      data: {
        exportOf: vi.fn(async () => ({ ...data, student: { ...juan, lastName: 'O"Brien; x' } })),
        deleteAll: vi.fn(),
      },
    });

    const result = await exportStudentData(principal, "student-1", d);

    expect((result as { fileName: string }).fileName).toBe("bantay-aral-o-brien-x-2026-06-19.json");
  });
});

describe("deleteStudent (Step 60.3)", () => {
  it("deletes with the name typed, then the photo file, and only for the session's school", async () => {
    const d = deps();

    await expect(deleteStudent(principal, "student-1", " juan  dela cruz ", d)).resolves.toEqual({ ok: true });

    expect(d.students.getInSchool).toHaveBeenCalledWith("school-a", "student-1");
    expect(d.data.deleteAll).toHaveBeenCalledWith("school-a", "student-1", { id: "staff-1", role: "principal" });
    expect(d.photos.delete).toHaveBeenCalledWith("school-a/student-1/photo.webp");
    // The database first, the file after.
    expect(vi.mocked(d.data.deleteAll).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(d.photos.delete).mock.invocationCallOrder[0],
    );
  });

  it("deletes nothing when the typed name is wrong, so a direct call can't skip the dialog", async () => {
    const d = deps();

    await expect(deleteStudent(principal, "student-1", "Juan", d)).resolves.toEqual({
      ok: false,
      code: "wrong_confirmation",
    });
    await expect(deleteStudent(principal, "student-1", "", d)).resolves.toEqual({
      ok: false,
      code: "wrong_confirmation",
    });
    expect(d.data.deleteAll).not.toHaveBeenCalled();
    expect(d.photos.delete).not.toHaveBeenCalled();
  });

  it("refuses a teacher and a super admin with no school open", async () => {
    const d = deps();

    await expect(deleteStudent({ ...principal, role: "teacher" }, "student-1", "Juan Dela Cruz", d)).resolves.toEqual({
      ok: false,
      code: "forbidden",
    });
    await expect(
      deleteStudent({ ...principal, role: "super_admin", schoolId: null }, "student-1", "Juan Dela Cruz", d),
    ).resolves.toEqual({ ok: false, code: "forbidden" });
    expect(d.data.deleteAll).not.toHaveBeenCalled();
  });

  it("answers not found for another school's student before checking the name", async () => {
    const d = deps({ students: { getInSchool: vi.fn(async () => null) } });

    await expect(deleteStudent(principal, "student-9", "Juan Dela Cruz", d)).resolves.toEqual({
      ok: false,
      code: "not_found",
    });
    expect(d.data.deleteAll).not.toHaveBeenCalled();
  });

  it("answers not found when a double click finds nothing left to delete", async () => {
    const d = deps({ data: { exportOf: vi.fn(), deleteAll: vi.fn(async () => null) } });

    await expect(deleteStudent(principal, "student-1", "Juan Dela Cruz", d)).resolves.toEqual({
      ok: false,
      code: "not_found",
    });
  });

  it("keeps the deletion when the photo file can't be removed, and says which key, never a name", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const d = deps({
      photos: {
        get: vi.fn(),
        delete: vi.fn(async () => {
          throw new Error("storage down");
        }),
      },
    });

    await expect(deleteStudent(principal, "student-1", "Juan Dela Cruz", d)).resolves.toEqual({ ok: true });

    expect(error).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(error.mock.calls);
    expect(logged).toContain("school-a/student-1/photo.webp");
    expect(logged).not.toContain("Juan");
    error.mockRestore();
  });

  it("skips the file when the student had no photo", async () => {
    const d = deps({ data: { exportOf: vi.fn(), deleteAll: vi.fn(async () => ({ photoKey: null })) } });

    await expect(deleteStudent(principal, "student-1", "Juan Dela Cruz", d)).resolves.toEqual({ ok: true });
    expect(d.photos.delete).not.toHaveBeenCalled();
  });
});
