/**
 * The Bantay Aral mark, as plain vector data: a parent (blue) holding a child
 * (green) over an open book, with the sun's rays. Copied on 2026-10-19 from
 * Talaan's src/components/brand/mark-shapes.ts and src/lib/theme/brand.ts.
 *
 * A reference, not app code: move the shapes into src/ (for example
 * src/components/brand/) and draw them with react-native-svg, taking the
 * colours from the theme's brand tokens (docs/DESIGN.md). On the web the mark
 * is drawn in this order: parent head, parent body (gradient from parentTop
 * to parent), child head, the light page, the child's page, the deep page,
 * the two page edges (stroked), the three rays (stroked, round caps).
 */
export const MARK_VIEWBOX = "0 0 106 100";

export const MARK = {
  parentHead: { cx: 40, cy: 15, r: 11 },
  parentBody: "M62 49 C 56 35, 39 28, 25 34 C 7 42, 2 68, 18 82 C 26 89, 36 92, 47 97 C 46 91, 46 87, 48 83 Z",
  /** The parent figure's vertical gradient, in viewBox units, from parentTop down to parent. */
  parentGradient: { y1: 24, y2: 97 },
  childHead: { cx: 68, cy: 34, r: 10.5 },
  pageLight: "M50 82 C 52 72, 54 63, 54 57 C 46 49, 32 47, 24 51 C 19 55, 17 60, 16 65 C 30 64, 43 71, 50 82 Z",
  pageChild: "M50 82 C 53 71, 56 62, 59 55 C 67 49, 82 45, 93 43 C 93 52, 90 58, 86 61 C 72 63, 58 70, 50 82 Z",
  pageDeep: "M50 84 C 60 71, 76 63, 96 59 C 93 73, 75 85, 50 87 Z",
  edges: ["M13 67 C 30 65, 44 72, 50 83", "M50 83 C 58 70, 74 62, 97 58"],
  edgeWidth: 2.8,
  rays: ["M82 7 L 84 15", "M91 21 L 97 16", "M94 30 L 102 30"],
  rayWidth: 4.2,
} as const;

export type MarkColors = {
  parentTop: string;
  parent: string;
  child: string;
  pageLight: string;
  pageDeep: string;
  edge: string;
  sun: string;
};

/** Light mode, and the app icon and splash screen. */
export const BRAND_MARK_LIGHT: MarkColors = {
  parentTop: "#2F80D0",
  parent: "#1149A6",
  child: "#2FA866",
  pageLight: "#6CC896",
  pageDeep: "#126A5C",
  edge: "#FFFFFF",
  sun: "#F8B014",
};

/** Dark mode: a white parent on navy. `edge` matches the dark background. */
export const BRAND_MARK_DARK: MarkColors = {
  parentTop: "#FFFFFF",
  parent: "#C9D6EA",
  child: "#2FA866",
  pageLight: "#6CC896",
  pageDeep: "#3FA57A",
  edge: "#0D1526",
  sun: "#F8B014",
};

/** The app icon's tile behind the mark. */
export const BRAND_ICON_BACKGROUND = "#FFFFFF";

/** The brand's line, from the owner's brand sheet. */
export const BRAND_TAGLINE = "Every school day, connected with care.";

/** The mark as a standalone SVG document, for generating the app icon and splash screen. */
export function markSvgMarkup(colors: MarkColors): string {
  const { parentHead: h, childHead: c, parentGradient: g } = MARK;
  const stroke = (d: string, color: string, width: number) =>
    `<path d="${d}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" fill="none"/>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}">`,
    `<defs><linearGradient id="p" x1="0" y1="${g.y1}" x2="0" y2="${g.y2}" gradientUnits="userSpaceOnUse">`,
    `<stop offset="0" stop-color="${colors.parentTop}"/><stop offset="1" stop-color="${colors.parent}"/></linearGradient></defs>`,
    `<circle cx="${h.cx}" cy="${h.cy}" r="${h.r}" fill="${colors.parentTop}"/>`,
    `<path d="${MARK.parentBody}" fill="url(#p)"/>`,
    `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${colors.child}"/>`,
    `<path d="${MARK.pageLight}" fill="${colors.pageLight}"/>`,
    `<path d="${MARK.pageChild}" fill="${colors.child}"/>`,
    `<path d="${MARK.pageDeep}" fill="${colors.pageDeep}"/>`,
    ...MARK.edges.map((d) => stroke(d, colors.edge, MARK.edgeWidth)),
    ...MARK.rays.map((d) => stroke(d, colors.sun, MARK.rayWidth)),
    "</svg>",
  ].join("");
}
