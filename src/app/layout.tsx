import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemePresetStyle } from "@/lib/theme/theme-preset-style";
import { DEFAULT_THEME_PRESET_ID, getThemePreset } from "@/lib/theme/presets";
import { Toaster } from "@/components/ui/sonner";
import { PRODUCT_NAME } from "@/lib/product";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  // Each page gives just its own part ("Gate"); this adds the product's name.
  title: { default: PRODUCT_NAME, template: `%s · ${PRODUCT_NAME}` },
  applicationName: PRODUCT_NAME,
  description: "School attendance portal",
};

const defaultPreset = getThemePreset(DEFAULT_THEME_PRESET_ID);

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
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
