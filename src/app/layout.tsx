import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Lexend } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemePresetStyle } from "@/lib/theme/theme-preset-style";
import { DEFAULT_THEME_PRESET_ID, getThemePreset } from "@/lib/theme/presets";
import { Toaster } from "@/components/ui/sonner";
import { PRODUCT_NAME } from "@/lib/product";
import "./globals.css";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const atkinsonHyperlegible = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  // Each page gives just its own part ("Gate"); this adds the product's name.
  title: { default: PRODUCT_NAME, template: `%s · ${PRODUCT_NAME}` },
  applicationName: PRODUCT_NAME,
  description: "School attendance portal",
};

const defaultPreset = getThemePreset(DEFAULT_THEME_PRESET_ID);

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${lexend.variable} ${atkinsonHyperlegible.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemePresetStyle tokens={{ light: defaultPreset.light, dark: defaultPreset.dark }} />
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
