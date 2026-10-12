import { describe, expect, it } from "vitest";
import { staffRowActions } from "./row-actions";
import type { Staff } from "./types";

const invitedTeacher: Staff = {
  id: "staff-teacher",
  schoolId: "school-a",
  role: "teacher",
  firstName: "Mark",
  lastName: "Santos",
  email: "mark@talaan.example",
  status: "invited",
};

const activePrincipal: Staff = { ...invitedTeacher, id: "staff-principal", role: "principal", status: "active" };

describe("staffRowActions", () => {
  it("offers a sign-in link for anyone except the signed-in person", () => {
    expect(staffRowActions(invitedTeacher, "staff-principal").canMakeLink).toBe(true);
    expect(staffRowActions(activePrincipal, "someone-else").canMakeLink).toBe(true);
    expect(staffRowActions(activePrincipal, "staff-principal").canMakeLink).toBe(false);
  });

  it("offers remove for anyone except the signed-in person", () => {
    expect(staffRowActions(invitedTeacher, "staff-principal").canRemove).toBe(true);
    expect(staffRowActions(activePrincipal, "staff-principal").canRemove).toBe(false);
  });
});
