import { describe, expect, it } from "vitest";
import { centreSquare } from "./resize-photo";

describe("centreSquare", () => {
  it("crops a portrait photo to its middle square", () => {
    expect(centreSquare(3000, 4000)).toEqual({ x: 0, y: 500, side: 3000 });
  });

  it("crops a landscape photo to its middle square", () => {
    expect(centreSquare(1920, 1080)).toEqual({ x: 420, y: 0, side: 1080 });
  });

  it("keeps a square photo whole", () => {
    expect(centreSquare(512, 512)).toEqual({ x: 0, y: 0, side: 512 });
  });
});
