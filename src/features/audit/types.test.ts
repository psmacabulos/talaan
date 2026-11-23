import { describe, expect, it } from "vitest";
import { AuditAction, AuditTarget } from "@/generated/prisma/enums";
import { AUDIT_ACTIONS } from "./types";

describe("audit types (Step 60.1)", () => {
  it("lists exactly the actions the database enum has", () => {
    expect([...AUDIT_ACTIONS].sort()).toEqual(Object.values(AuditAction).sort());
  });

  it("has the targets the page knows how to name", () => {
    expect(Object.values(AuditTarget).sort()).toEqual(["school", "staff", "student"]);
  });
});
