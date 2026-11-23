import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const getInSchool = vi.fn();
const remove = vi.fn();
const recordAudit = vi.fn();

vi.mock("@/lib/session", () => ({ getSession: () => getSession() }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/data/repositories", () => ({
  staffRepository: {
    getInSchool: (schoolId: string, id: string) => getInSchool(schoolId, id),
    remove: (schoolId: string, id: string) => remove(schoolId, id),
  },
}));
vi.mock("@/services/audit/record-audit", () => ({
  actorOf: (session: { userId: string; role: string }) => ({ id: session.userId, role: session.role }),
  recordAudit: (event: unknown) => recordAudit(event),
}));

import { removeStaff } from "./actions";

const principal = { userId: "staff-p", role: "principal", schoolId: "school-a" };
const teacher = { id: "staff-t", schoolId: "school-a", role: "teacher", firstName: "Ana", lastName: "Reyes" };

describe("removeStaff and the Activity log (Step 60.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue(principal);
    getInSchool.mockResolvedValue(teacher);
  });

  it("records who removed whom, by id, with no name", async () => {
    await expect(removeStaff("staff-t")).resolves.toEqual({ ok: true });

    expect(remove).toHaveBeenCalledWith("school-a", "staff-t");
    expect(recordAudit).toHaveBeenCalledWith({
      schoolId: "school-a",
      actor: { id: "staff-p", role: "principal" },
      action: "staff_removed",
      targetType: "staff",
      targetId: "staff-t",
    });
    expect(JSON.stringify(recordAudit.mock.calls)).not.toContain("Reyes");
  });

  it("records nothing when the removal is refused", async () => {
    getSession.mockResolvedValue({ ...principal, userId: "staff-t" });
    await expect(removeStaff("staff-t")).resolves.toMatchObject({ ok: false });
    getSession.mockResolvedValue({ ...principal, role: "teacher" });
    await expect(removeStaff("staff-t")).resolves.toMatchObject({ ok: false });

    expect(remove).not.toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
  });
});
