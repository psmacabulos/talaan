"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MODES = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "Match device", Icon: Monitor },
] as const;

/**
 * The per-browser light/dark control (Step 27.5), separate from the
 * school's color theme. The trigger swaps sun and moon with the `dark:`
 * variant rather than reading `resolvedTheme`, so the server and the first
 * client render agree and there's no hydration mismatch or flicker. The
 * menu only renders once opened, by which point next-themes knows the saved
 * choice.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    // Not modal, same as the notification bell: a modal menu hides the page
    // from screen readers while its links stay tabbable (Step 27).
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label="Light or dark mode">
          <Sun className="dark:hidden" aria-hidden="true" />
          <Moon className="hidden dark:block" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Light or dark</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          {MODES.map(({ value, label, Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon className="text-muted-foreground" aria-hidden="true" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
