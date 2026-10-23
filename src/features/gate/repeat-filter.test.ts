import { describe, expect, it } from "vitest";
import { createRepeatFilter, REPEAT_WINDOW_MS } from "./repeat-filter";

describe("createRepeatFilter (Step 56)", () => {
  it("drops the same card read again within 5 seconds", () => {
    const filter = createRepeatFilter();
    expect(filter.isRepeat("0211299923", 0)).toBe(false);
    expect(filter.isRepeat("0211299923", 300)).toBe(true);
    expect(filter.isRepeat("0211299923", 300 + REPEAT_WINDOW_MS)).toBe(false);
  });

  it("sends a card held on the reader once, however long it stays", () => {
    const filter = createRepeatFilter();
    const sent = Array.from({ length: 20 }, (_, second) => filter.isRepeat("0211299923", second * 1_000)).filter(
      (repeat) => !repeat,
    );
    expect(sent).toHaveLength(1);
  });

  it("sends a different card at once, and the first card again after it", () => {
    const filter = createRepeatFilter();
    expect(filter.isRepeat("0211299923", 0)).toBe(false);
    expect(filter.isRepeat("0213292883", 500)).toBe(false);
    expect(filter.isRepeat("0211299923", 1_000)).toBe(false);
  });
});
