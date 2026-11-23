import { describe, expect, it, vi } from "vitest";
import type { AuditEvent } from "@/features/audit/types";
import { ACTIVITY_PAGE_SIZE } from "@/features/audit/search-params";
import { FORMER_STAFF, listActivity, REMOVED_STUDENT } from "./list-activity";

function event(n: number, overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    action: "student_updated",
    actorId: "staff-1",
    actorRole: "principal",
    targetType: "student",
    targetId: "student-1",
    details: { fields: ["section"] },
    createdAt: new Date(Date.UTC(2026, 5, 19, 1, 0, 60 - n)).toISOString(),
    ...overrides,
  };
}

function deps(events: AuditEvent[]) {
  return {
    audit: { listPage: vi.fn(async () => events) },
    staff: {
      listBySchool: vi.fn(async () => [
        { id: "staff-1", firstName: "Catherine", lastName: "Lopez" },
        { id: "staff-2", firstName: "Ana", lastName: "Reyes" },
      ]),
    },
    students: {
      listByIdsInSchool: vi.fn(async () => [{ id: "student-1", firstName: "Juan", lastName: "Dela Cruz" }]),
    },
  } as unknown as Parameters<typeof listActivity>[2];
}

describe("listActivity (Step 60.1)", () => {
  it("names the actor and the student, with one read each for names", async () => {
    const d = deps([event(1), event(2)])!;
    const page = await listActivity("school-a", { group: "all", before: null }, d);

    expect(page.rows[0]).toMatchObject({ actorName: "Catherine Lopez", targetName: "Juan Dela Cruz" });
    expect(d.staff.listBySchool).toHaveBeenCalledTimes(1);
    expect(d.students.listByIdsInSchool).toHaveBeenCalledWith("school-a", ["student-1"]);
    expect(page.next).toBeNull();
  });

  it("shows a removed staff member or student as removed, and a super admin by role", async () => {
    const page = await listActivity(
      "school-a",
      { group: "all", before: null },
      deps([
        event(1, { actorId: "gone", targetId: "gone-student" }),
        event(2, { actorId: "super", actorRole: "super_admin", action: "school_opened", targetType: "school" }),
      ]),
    );
    expect(page.rows[0]).toMatchObject({ actorName: FORMER_STAFF, targetName: REMOVED_STUDENT });
    expect(page.rows[1]).toMatchObject({ actorName: "A super admin", targetName: null });
  });

  it("asks for one row more than a page, and gives the next page's start", async () => {
    const many = Array.from({ length: ACTIVITY_PAGE_SIZE + 1 }, (_, i) => event(i + 1));
    const d = deps(many)!;
    const page = await listActivity("school-a", { group: "cards", before: null }, d);

    expect(page.rows).toHaveLength(ACTIVITY_PAGE_SIZE);
    expect(page.next).toEqual({
      createdAt: many[ACTIVITY_PAGE_SIZE - 1].createdAt,
      id: many[ACTIVITY_PAGE_SIZE - 1].id,
    });
    expect(d.audit.listPage).toHaveBeenCalledWith("school-a", {
      actions: ["card_linked", "card_replaced", "card_marked_lost"],
      before: null,
      limit: ACTIVITY_PAGE_SIZE + 1,
    });
  });
});
