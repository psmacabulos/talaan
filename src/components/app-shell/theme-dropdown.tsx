"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { themePresets, type ThemePresetId } from "@/lib/theme/presets";
import { setThemeOverride } from "@/lib/theme/theme-override-actions";

/**
 * The compact top-bar preset preview (principal and super admin only —
 * CLAUDE.md's design-system rule 4). A live, per-browser preview: picking
 * one recolors everything immediately with no flash (setThemeOverride sets
 * a cookie, which Next re-renders the page for automatically), but nothing
 * is saved to the school's own record yet — that's Step 21's job. Matches
 * design/school-portal-prototype.html's own `theme(t)` handler, which is
 * equally ephemeral.
 */
export function ThemeDropdown({ presetId }: { presetId: ThemePresetId }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    const preset = themePresets.find((candidate) => candidate.id === value);
    startTransition(async () => {
      await setThemeOverride(value as ThemePresetId);
      if (preset) toast(`Theme changed to ${preset.name}.`);
    });
  }

  return (
    <Select value={presetId} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" aria-label="Color theme" className="w-auto gap-1.5 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {themePresets.map((preset) => (
          <SelectItem key={preset.id} value={preset.id}>
            {preset.id === "school" ? "School colors" : preset.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
