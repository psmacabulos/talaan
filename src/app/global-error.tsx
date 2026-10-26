"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/features/errors/error-page";
import { fontVariables } from "@/lib/fonts";
import { PRODUCT_NAME } from "@/lib/product";
import { DEFAULT_THEME_PRESET_ID, getThemePreset } from "@/lib/theme/presets";
import { ThemePresetStyle } from "@/lib/theme/theme-preset-style";
import "./globals.css";

const defaultPreset = getThemePreset(DEFAULT_THEME_PRESET_ID);

/**
 * When the root layout itself fails (Step 59.1). It replaces that layout,
 * so it brings its own `<html>`, styles, fonts and theme colors. There's no
 * theme provider here, so no light/dark toggle: it follows the person's
 * saved choice, or else the device's.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", prefersDark());
  }, []);

  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <title>{`Something went wrong · ${PRODUCT_NAME}`}</title>
        <ThemePresetStyle tokens={{ light: defaultPreset.light, dark: defaultPreset.dark }} />
        <ErrorPage error={error} retry={retry} showThemeToggle={false} />
      </body>
    </html>
  );
}

/** next-themes keeps the person's choice under `theme`; "system", or none, means the device's. */
function prefersDark(): boolean {
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem("theme");
  } catch {
    // Storage blocked: fall back to the device.
  }
  if (saved === "dark" || saved === "light") return saved === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
