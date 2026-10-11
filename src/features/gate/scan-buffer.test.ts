import { describe, expect, it } from "vitest";
import { createScanBuffer } from "./scan-buffer";

function type(buffer: ReturnType<typeof createScanBuffer>, text: string, start: number, gapMs: number) {
  let at = start;
  for (const key of text) {
    buffer.key(key, at);
    at += gapMs;
  }
  buffer.key("Enter", at);
  return at;
}

describe("createScanBuffer", () => {
  it("turns a reader's fast digits and Enter into one scan", () => {
    const scans: string[] = [];
    type(
      createScanBuffer((raw) => scans.push(raw)),
      "0211299923",
      0,
      5,
    );
    expect(scans).toEqual(["0211299923"]);
  });

  it("ignores a person typing slowly, and a lone Enter", () => {
    const scans: string[] = [];
    const buffer = createScanBuffer((raw) => scans.push(raw));
    type(buffer, "0211299923", 0, 250);
    buffer.key("Enter", 10_000);
    expect(scans).toEqual([]);
  });

  it("gives two scans for two cards back to back", () => {
    const scans: string[] = [];
    const buffer = createScanBuffer((raw) => scans.push(raw));
    const end = type(buffer, "0211299923", 0, 5);
    type(buffer, "0213292883", end + 300, 5);
    expect(scans).toEqual(["0211299923", "0213292883"]);
  });

  it("drops a stray key typed just before a card", () => {
    const scans: string[] = [];
    const buffer = createScanBuffer((raw) => scans.push(raw));
    buffer.key("x", 0);
    type(buffer, "0211299923", 500, 5);
    expect(scans).toEqual(["0211299923"]);
  });

  it("ignores keys like Shift inside a scan", () => {
    const scans: string[] = [];
    const buffer = createScanBuffer((raw) => scans.push(raw));
    buffer.key("Shift", 0);
    type(buffer, "53:2E:98:0C", 1, 5);
    expect(scans).toEqual(["53:2E:98:0C"]);
  });
});
