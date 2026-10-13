import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { markSvgMarkup } from "@/components/brand/mark-shapes";
import { BRAND_MARK_LIGHT } from "./brand";

/** oklch(L% C H) → "#RRGGBB", the standard OKLab conversion. */
function oklchToHex(value: string): string {
  const [l, c, h] = value.match(/[\d.]+/g)!.map(Number);
  const L = l / 100;
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const lms = [
    L + 0.3963377774 * a + 0.2158037573 * b,
    L - 0.1055613458 * a - 0.0638541728 * b,
    L - 0.0894841775 * a - 1.291485548 * b,
  ].map((x) => x ** 3);
  const linear = [
    4.0767416621 * lms[0] - 3.3077115913 * lms[1] + 0.2309699292 * lms[2],
    -1.2684380046 * lms[0] + 2.6097574011 * lms[1] - 0.3413193965 * lms[2],
    -0.0041960863 * lms[0] - 0.7034186147 * lms[1] + 1.707614701 * lms[2],
  ];
  const channel = (x: number) => {
    const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.max(x, 0) ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255);
  };
  return (
    "#" +
    linear
      .map((x) => channel(x).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

const TOKENS = readFileSync(path.join(process.cwd(), "src/styles/tokens.css"), "utf8");
const LIGHT_BLOCK = TOKENS.slice(0, TOKENS.indexOf(".dark {"));

function lightToken(name: string): string {
  const match = LIGHT_BLOCK.match(new RegExp(`--${name}:\\s*(oklch\\([^)]*\\))`));
  if (!match) throw new Error(`--${name} isn't in tokens.css`);
  return oklchToHex(match[1]);
}

/** Two hex colors within one step per channel: the tokens round to 0.1% lightness. */
function close(a: string, b: string): boolean {
  const parts = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [x, y] = [parts(a), parts(b)];
  return x.every((value, i) => Math.abs(value - y[i]) <= 1);
}

describe("Bantay Aral brand colors (Step 51.6)", () => {
  it.each([
    ["parentTop", "brand-parent-top"],
    ["parent", "brand-parent"],
    ["child", "brand-child"],
    ["pageLight", "brand-page-light"],
    ["pageDeep", "brand-page-deep"],
    ["edge", "brand-edge"],
    ["sun", "brand-sun"],
  ] as const)("the icons' %s matches the --%s token", (key, token) => {
    expect(close(BRAND_MARK_LIGHT[key], lightToken(token))).toBe(true);
  });

  it("draws the icon's mark with exactly these colors", () => {
    const svg = markSvgMarkup(BRAND_MARK_LIGHT);
    for (const color of Object.values(BRAND_MARK_LIGHT)) expect(svg).toContain(color);
    expect(svg.startsWith("<svg")).toBe(true);
  });
});
