import { describe, expect, it } from "vitest";
import { confirmationNameOf, fileSlug, isConfirmed } from "./privacy-confirm";

const juan = { firstName: "Juan", lastName: "Dela Cruz" };

describe("the typed confirmation (Step 60.3)", () => {
  it("is the name as every list shows it", () => {
    expect(confirmationNameOf(juan)).toBe("Juan Dela Cruz");
  });

  it("accepts it ignoring case and extra or odd spaces", () => {
    expect(isConfirmed("juan dela cruz", juan)).toBe(true);
    expect(isConfirmed("  Juan   Dela  Cruz ", juan)).toBe(true);
  });

  it("accepts a name typed with combining accents the same as a precomposed one", () => {
    const jose = { firstName: "José", lastName: "Peña" };
    expect(isConfirmed("José Peña", jose)).toBe(true);
  });

  it("refuses a different name, a part of it, or nothing", () => {
    expect(isConfirmed("Juan", juan)).toBe(false);
    expect(isConfirmed("Juan Cruz", juan)).toBe(false);
    expect(isConfirmed("", juan)).toBe(false);
    expect(isConfirmed("delete", juan)).toBe(false);
  });
});

describe("fileSlug (Step 60.3)", () => {
  it("keeps letters and digits only, so a name can't reach the download's header", () => {
    expect(fileSlug('Dela Cruz"; filename="x')).toBe("dela-cruz-filename-x");
    expect(fileSlug("Peña")).toBe("pena");
    expect(fileSlug("../../etc")).toBe("etc");
  });

  it("never answers nothing", () => {
    expect(fileSlug("")).toBe("student");
    expect(fileSlug("???")).toBe("student");
  });
});
