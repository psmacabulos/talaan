"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Deliberate: this is next-themes' own documented pattern for avoiding a
    // hydration mismatch, since resolvedTheme is only known once mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground"
        disabled
        aria-hidden
      >
        Toggle theme
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground transition-colors duration-base hover:bg-accent hover:text-accent-foreground"
    >
      {isDark ? "Switch to light mode" : "Switch to dark mode"}
    </button>
  );
}
