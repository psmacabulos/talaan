import { describe, expect, it } from "vitest";
import { AUDIT_ACTIONS } from "./types";
import { changedFieldsText, roleLabel, verbFor } from "./describe";

describe("describing an event (Step 60.1)", () => {
  it("has words for every action", () => {
    for (const action of AUDIT_ACTIONS) expect(verbFor(action).length).toBeGreaterThan(0);
  });

  it("names the changed fields in plain words", () => {
    expect(changedFieldsText(["guardianMobile", "lrn", "photo"])).toBe("guardian mobile, LRN, photo");
    expect(changedFieldsText([])).toBeNull();
    expect(changedFieldsText(undefined)).toBeNull();
  });

  it("labels roles", () => {
    expect(roleLabel("super_admin")).toBe("Super admin");
  });
});
