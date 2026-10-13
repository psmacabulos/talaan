/**
 * The Bantay Aral logo's colors (Step 51.6), for the places CSS variables
 * can't reach: the app icons, which are drawn into PNG files at build time
 * (src/app/icon.tsx, src/app/apple-icon.tsx). Everywhere else uses the
 * `--brand-*` tokens in src/styles/tokens.css, which hold these same light
 * values (a test keeps the two in step).
 */
export type MarkColors = {
  parentTop: string;
  parent: string;
  child: string;
  pageLight: string;
  pageDeep: string;
  edge: string;
  sun: string;
};

export const BRAND_MARK_LIGHT: MarkColors = {
  parentTop: "#2F80D0",
  parent: "#1149A6",
  child: "#2FA866",
  pageLight: "#6CC896",
  pageDeep: "#126A5C",
  edge: "#FFFFFF",
  sun: "#F8B014",
};

/** The app icon's tile behind the mark. */
export const BRAND_ICON_BACKGROUND = "#FFFFFF";
