import { Atkinson_Hyperlegible, Lexend } from "next/font/google";

/**
 * The app's two fonts, shared by the root layout and `global-error.tsx`,
 * which replaces the root layout when it fails and so must load its own
 * (Step 59.1).
 */
export const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const atkinsonHyperlegible = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

/** The class names that make both fonts' CSS variables available. */
export const fontVariables = `${lexend.variable} ${atkinsonHyperlegible.variable}`;
