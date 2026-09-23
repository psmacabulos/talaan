"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { themePresets, type ThemePresetId, type ThemeSelection } from "@/lib/theme/presets";
import { clearThemeOverride, setThemeOverride } from "@/lib/theme/theme-override-actions";

const SAVED: ThemeSelection = "saved";

/**
 * The compact top-bar preset preview (principal and super admin only —
 * CLAUDE.md's design-system rule 4). A live, per-browser preview: picking
 * one recolors everything immediately with no flash (setThemeOverride sets
 * a cookie, which Next re-renders the page for automatically), but nothing
 * is saved to the school's own record — that happens on Settings >
 * Appearance (Step 26). "Saved theme" drops the preview and goes back to
 * whatever the school saved there, including a custom brand color that no
 * named preset matches. Matches design/school-portal-prototype.html's own
 * `theme(t)` handler, which is equally ephemeral.
 */
export function ThemeDropdown({ selection, hasSchool }: { selection: ThemeSelection; hasSchool: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(async () => {
      if (value === SAVED) {
        await clearThemeOverride();
        toast("Showing your school's saved theme.");
        return;
      }
      const preset = themePresets.find((candidate) => candidate.id === value);
      await setThemeOverride(value as ThemePresetId);
      if (preset) toast(`Previewing the ${preset.name} theme.`);
    });
  }

  return (
    <Select value={selection} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" aria-label="Color theme" className="w-auto gap-1.5 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {hasSchool ? (
          <>
            <SelectItem value={SAVED}>Saved theme</SelectItem>
            <SelectSeparator />
          </>
        ) : null}
        {themePresets.map((preset) => (
          <SelectItem key={preset.id} value={preset.id}>
            {preset.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
