import { describe, expect, it } from "vitest";
import { portraitCrop } from "./resize-photo";

describe("portraitCrop", () => {
  it("keeps a 4:5 photo whole", () => {
    expect(portraitCrop(600, 750)).toEqual({ x: 0, y: 0, width: 600, height: 750 });
  });

  it("cuts a tall phone photo mostly from the bottom, so the face stays in", () => {
    // 1080 × 1920: a 4:5 frame is 1350 tall; of the 570 extra, a quarter goes from the top.
    expect(portraitCrop(1080, 1920)).toEqual({ x: 0, y: 142, width: 1080, height: 1350 });
  });

  it("cuts a square photo's sides equally", () => {
    expect(portraitCrop(500, 500)).toEqual({ x: 50, y: 0, width: 400, height: 500 });
  });

  it("cuts a landscape photo's sides equally", () => {
    expect(portraitCrop(1920, 1080)).toEqual({ x: 528, y: 0, width: 864, height: 1080 });
  });
});
