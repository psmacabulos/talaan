import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const deleteStudent = vi.fn();
const refresh = vi.fn();

vi.mock("@/lib/session", () => ({ getSession: () => getSession() }));
vi.mock("next/cache", () => ({ refresh: () => refresh() }));
vi.mock("@/services/students/student-privacy", () => ({
  deleteStudent: (...args: unknown[]) => deleteStudent(...args),
}));

import { deleteStudentAction } from "./privacy-actions";
import { NOT_FOUND_MESSAGE, WRONG_CONFIRMATION_MESSAGE } from "./privacy-messages";

const principal = { userId: "staff-1", role: "principal", schoolId: "school-a" };

describe("deleteStudentAction (Step 60.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue(principal);
  });

  it("deletes through the service with the session, and refreshes the list", async () => {
    deleteStudent.mockResolvedValue({ ok: true });

    await expect(deleteStudentAction("student-1", "Juan Dela Cruz")).resolves.toEqual({ ok: true });

    expect(deleteStudent).toHaveBeenCalledWith(principal, "student-1", "Juan Dela Cruz");
    expect(refresh).toHaveBeenCalled();
  });

  it("asks to sign in when signed out", async () => {
    getSession.mockResolvedValue(null);

    const result = await deleteStudentAction("student-1", "x");

    expect(result.ok).toBe(false);
    expect(deleteStudent).not.toHaveBeenCalled();
  });

  it("refuses arguments of the wrong shape without calling the service", async () => {
    await expect(deleteStudentAction(42, "x")).resolves.toEqual({ ok: false, error: WRONG_CONFIRMATION_MESSAGE });
    await expect(deleteStudentAction("student-1", { name: "x" })).resolves.toEqual({
      ok: false,
      error: WRONG_CONFIRMATION_MESSAGE,
    });
    expect(deleteStudent).not.toHaveBeenCalled();
  });

  it.each([
    ["forbidden", /permission/],
    ["wrong_confirmation", new RegExp(WRONG_CONFIRMATION_MESSAGE.slice(0, 12))],
    ["not_found", new RegExp(NOT_FOUND_MESSAGE.slice(0, 12))],
  ])("turns %s into a plain message and does not refresh", async (code, message) => {
    deleteStudent.mockResolvedValue({ ok: false, code });

    const result = await deleteStudentAction("student-1", "x");

    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(message) });
    expect(refresh).not.toHaveBeenCalled();
  });
});
