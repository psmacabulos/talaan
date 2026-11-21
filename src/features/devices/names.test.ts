import { describe, expect, it } from "vitest";
import { cleanDeviceName, deviceNameKey } from "./names";

describe("device names (Step 59.13)", () => {
  it("cleans spaces at the ends and inside", () => {
    expect(cleanDeviceName("  Main   gate  tablet ")).toBe("Main gate tablet");
  });

  it("treats names that differ only by case or spacing as the same", () => {
    expect(deviceNameKey("Main gate tablet")).toBe(deviceNameKey("  MAIN  gate tablet "));
  });

  it("keeps different names apart", () => {
    expect(deviceNameKey("Main gate")).not.toBe(deviceNameKey("Back gate"));
  });
});
