import { describe, expect, it } from "vitest";
import { errorReference } from "./error-reference";

describe("errorReference (Step 59.1)", () => {
  it("uses a server error's digest, which its report is already tagged with", () => {
    expect(errorReference(Object.assign(new Error("boom"), { digest: "2847561093" }))).toBe("2847561093");
  });

  it("gives a browser error a new 8-character code", () => {
    expect(errorReference(new Error("boom"))).toMatch(/^[0-9a-f]{8}$/);
    expect(errorReference("not even an Error")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("gives each browser error its own code", () => {
    expect(errorReference(new Error("a"))).not.toBe(errorReference(new Error("a")));
  });
});
