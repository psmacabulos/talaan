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
  it("offers resend only while an invite is pending", () => {
    expect(staffRowActions(invitedTeacher, "someone-else").canResend).toBe(true);
    expect(staffRowActions(activePrincipal, "someone-else").canResend).toBe(false);
  });

  it("offers remove for anyone except the signed-in person", () => {
    expect(staffRowActions(invitedTeacher, "staff-principal").canRemove).toBe(true);
    expect(staffRowActions(activePrincipal, "staff-principal").canRemove).toBe(false);
  });
});
