import { describe, expect, it } from "vitest";
import { actionsOfGroup, AUDIT_GROUPS } from "./groups";
import { AUDIT_ACTIONS } from "./types";

describe("Activity groups (Step 60.1)", () => {
  it("covers every action exactly once, so no event is hidden from every filter", () => {
    const grouped = AUDIT_GROUPS.flatMap((group) => [...group.actions]);
    expect(grouped.sort()).toEqual([...AUDIT_ACTIONS].sort());
  });

  it("answers null for everything", () => {
    expect(actionsOfGroup("all")).toBeNull();
    expect(actionsOfGroup("cards")).toContain("card_linked");
  });
});
