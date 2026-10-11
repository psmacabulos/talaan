import { describe, expect, it } from "vitest";
import { formatSseEvent, SSE_KEEP_ALIVE } from "./sse";

describe("formatSseEvent", () => {
  it("writes the event name, one line of JSON, and a blank line", () => {
    expect(formatSseEvent("tap", { id: "t1", name: "Juan\nCruz" })).toBe(
      'event: tap\ndata: {"id":"t1","name":"Juan\\nCruz"}\n\n',
    );
  });

  it("keeps the connection open with a comment line", () => {
    expect(SSE_KEEP_ALIVE.startsWith(":")).toBe(true);
    expect(SSE_KEEP_ALIVE.endsWith("\n\n")).toBe(true);
  });
});
