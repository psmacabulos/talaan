import { describe, expect, it } from "vitest";
import { createMockParentStudentLinkRepository } from "@/data/repositories/parent-student-link-repository";
import { createMockSchoolRepository } from "@/data/repositories/school-repository";
import { createMockStudentRepository } from "@/data/repositories/student-repository";
import type { School } from "@/features/schools/types";
import type { Student } from "@/features/students/types";
import { linkChildToParent, NO_MATCHING_CHILD_MESSAGE, type LinkChildDeps } from "./link-child-to-parent";

const schoolA: School = {
  id: "school-a",
  name: "School A",
  theme: { kind: "preset", presetId: "school" },
  showDepedLogo: false,
  notificationPreference: "time_in_only",
  lateAfter: "08:05",
  absentFrom: "09:00",
};
const schoolB: School = { ...schoolA, id: "school-b", name: "School B" };

const juan: Student = {
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
};

const details = { schoolId: "school-a", lrn: "100000000123", lastName: "dela cruz", birthDate: "2012-03-14" };

function deps(): LinkChildDeps {
  return {
    schools: createMockSchoolRepository([schoolA, schoolB], { latencyMs: 0 }),
    students: createMockStudentRepository([juan], { latencyMs: 0 }),
    links: createMockParentStudentLinkRepository([], { latencyMs: 0 }),
  };
}

describe("linkChildToParent", () => {
  it("links a child whose details match at the chosen school, and saves that school", async () => {
    const d = deps();
    await expect(linkChildToParent("parent-a", details, d)).resolves.toEqual({ ok: true, student: juan });
    await expect(d.links.listByParent("parent-a")).resolves.toMatchObject([
      { parentId: "parent-a", studentId: juan.id, schoolId: "school-a" },
    ]);
  });

  it("finds no match at another school, even with the right details", async () => {
    await expect(linkChildToParent("parent-a", { ...details, schoolId: "school-b" }, deps())).resolves.toEqual({
      ok: false,
      code: "no_match",
      formError: NO_MATCHING_CHILD_MESSAGE,
    });
  });

  it("asks for a school again when it doesn't exist", async () => {
    await expect(linkChildToParent("parent-a", { ...details, schoolId: "school-zzz" }, deps())).resolves.toEqual({
      ok: false,
      code: "invalid_input",
      fieldErrors: { schoolId: "Select your child's school" },
    });
  });

  it("returns each field's first message for bad input", async () => {
    const result = await linkChildToParent("parent-a", { ...details, lrn: "12" }, deps());
    expect(result).toMatchObject({ ok: false, code: "invalid_input", fieldErrors: { lrn: expect.any(String) } });
  });

  it("says a child is already linked, the second time", async () => {
    const d = deps();
    await linkChildToParent("parent-a", details, d);
    await expect(linkChildToParent("parent-a", details, d)).resolves.toEqual({
      ok: false,
      code: "already_linked",
      formError: "Juan Dela Cruz is already linked to your account.",
    });
  });

  it("says 'already linked' when the same form sent twice at once loses the race", async () => {
    const d = deps();
    const racing: LinkChildDeps = { ...d, links: { listByParent: async () => [], create: async () => null } };
    await expect(linkChildToParent("parent-a", details, racing)).resolves.toMatchObject({ code: "already_linked" });
  });
});
