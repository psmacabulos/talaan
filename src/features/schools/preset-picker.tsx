"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { presetToScopedCss } from "@/lib/theme/apply-preset";
import { themePresets, type ThemePresetId } from "@/lib/theme/presets";

// One <style> block holding all five presets' scoped CSS, computed once at
// module load — the same presetToScopedCss mechanism the design-system page
// uses, so each card's mini swatch shows that preset's own real token
// values without hardcoding any color in this file (keeps check:tokens
// green). The swatch chips below use plain token utilities (bg-primary
// etc.), which read the variables this style block defines for them.
export const PRESET_SWATCH_CSS = themePresets
  .map((preset) => presetToScopedCss(preset, presetSwatchSelector(preset.id)))
  .join("");

/** The selector a swatch's colors are scoped to — also used by Step 26's "Custom" swatch, whose palette is generated at runtime. */
export function presetSwatchSelector(id: string): string {
  return `[data-preset-swatch="${id}"]`;
}

/** Four chips of one theme's colors: primary, accent, background and the shared highlight. */
export function PresetSwatch({ id }: { id: string }) {
  return (
    <span
      data-preset-swatch={id}
      aria-hidden="true"
      className="flex items-center gap-1 rounded-md border border-border p-1.5"
    >
      <span className="size-3 rounded-full bg-primary" />
      <span className="size-3 rounded-full bg-accent" />
      <span className="size-3 rounded-full border border-border bg-background" />
      <span className="size-3 rounded-full bg-highlight" />
    </span>
  );
}

/**
 * Step 25's theme choice inside the add-school form: the five named
 * presets as radio cards, each carrying a small swatch of its own colors.
 * Custom brand colors are deliberately not here — a principal sets one
 * later on Settings > Appearance (Step 26's appearance-settings-form.tsx,
 * which reuses `PresetSwatch` below).
 */
export function PresetPicker({
  value,
  onValueChange,
  error,
}: {
  value: ThemePresetId;
  onValueChange: (value: ThemePresetId) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <style dangerouslySetInnerHTML={{ __html: PRESET_SWATCH_CSS }} />
      <RadioGroup
        value={value}
        onValueChange={(next) => onValueChange(next as ThemePresetId)}
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      >
        {themePresets.map((preset) => (
          <div
            key={preset.id}
            className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5"
          >
            <RadioGroupItem value={preset.id} id={`school-preset-${preset.id}`} className="mt-0.5" />
            {/* items-start overrides the Label base's items-center: inside a
                flex-col it must left-align the name and swatch, or both end
                up centered — and on a phone the two-column grid is far too
                narrow for the four swatch chips, hence stacking there. */}
            <Label
              htmlFor={`school-preset-${preset.id}`}
              className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-1.5"
            >
              <span className="text-sm text-foreground">{preset.name}</span>
              <PresetSwatch id={preset.id} />
            </Label>
          </div>
        ))}
      </RadioGroup>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
