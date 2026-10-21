import { describe, expect, it } from "vitest";
import { shouldNotifyParents } from "./notify-parents";

describe("shouldNotifyParents", () => {
  it("follows the school's one setting", () => {
    expect(shouldNotifyParents("off", "time_in")).toBe(false);
    expect(shouldNotifyParents("off", "time_out")).toBe(false);
    expect(shouldNotifyParents("time_in_only", "time_in")).toBe(true);
    expect(shouldNotifyParents("time_in_only", "time_out")).toBe(false);
    expect(shouldNotifyParents("time_in_and_time_out", "time_in")).toBe(true);
    expect(shouldNotifyParents("time_in_and_time_out", "time_out")).toBe(true);
  });
});
