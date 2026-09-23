"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { resolveSchoolTheme } from "@/lib/theme/active-theme";
import { presetToScopedCss } from "@/lib/theme/apply-preset";
import { checkCustomBrandColor } from "@/lib/theme/contrast";
import { DEFAULT_CUSTOM_BRAND_COLOR, themePresets, type ThemePresetId } from "@/lib/theme/presets";
import { updateSchoolTheme } from "./actions";
import { PRESET_SWATCH_CSS, PresetSwatch, presetSwatchSelector } from "./preset-picker";
import { schoolThemeSchema } from "./schemas";
import { ThemePreview } from "./theme-preview";
import type { SchoolTheme } from "./types";

type Choice = ThemePresetId | "custom";

const HEX_INPUT_ID = "appearance-brand-hex";
const HEX_ERROR_ID = "appearance-brand-hex-error";
const CONTRAST_STATUS_ID = "appearance-contrast-status";

/** Validates typed hex text the same way the server does; returns the error message, or null if it's a usable color. */
function hexError(value: string): string | null {
  const result = schoolThemeSchema.safeParse({ kind: "custom", brandColor: value });
  return result.success ? null : (result.error.issues[0]?.message ?? "Enter a valid color");
}

/** Expands three-digit shorthand to six uppercase digits — the native color input only accepts the six-digit form. */
function toSixDigitHex(value: string): string {
  const digits = value.slice(1);
  const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join("") : digits;
  return `#${full.toUpperCase()}`;
}

function sameTheme(a: SchoolTheme, b: SchoolTheme): boolean {
  if (a.kind === "preset" && b.kind === "preset") return a.presetId === b.presetId;
  if (a.kind === "custom" && b.kind === "custom") return toSixDigitHex(a.brandColor) === toSixDigitHex(b.brandColor);
  return false;
}

/**
 * Settings > Appearance (Step 26), principal and super admin only. A
 * gallery of the named presets plus "Custom" (one brand color, full
 * palette generated from it), a live light/dark preview, and Save. Only
 * the preview changes while choosing — the rest of the app keeps the
 * school's saved theme until `updateSchoolTheme` stores the new one.
 *
 * A custom color is never saved in a state that fails WCAG AA: an invalid
 * hex is rejected inline (and again by the server action), and a valid but
 * too-light color is corrected by generateCustomPalette, with the before
 * and after shown here so the correction is never silent.
 */
export function AppearanceSettingsForm({ currentTheme }: { currentTheme: SchoolTheme }) {
  const [choice, setChoice] = useState<Choice>(currentTheme.kind === "custom" ? "custom" : currentTheme.presetId);
  const [hexText, setHexText] = useState(
    toSixDigitHex(currentTheme.kind === "custom" ? currentTheme.brandColor : DEFAULT_CUSTOM_BRAND_COLOR),
  );
  // The last color that passed validation — the preview and swatch keep
  // showing it while the text box holds a half-typed value.
  const [brandColor, setBrandColor] = useState(hexText);
  const [isPending, startTransition] = useTransition();

  const error = choice === "custom" ? hexError(hexText) : null;
  const pendingTheme: SchoolTheme =
    choice === "custom" ? { kind: "custom", brandColor } : { kind: "preset", presetId: choice };
  const dirty = !sameTheme(pendingTheme, currentTheme);

  // Generating a custom palette nudges colors step by step until they pass
  // AA — memoized so it only reruns when the color actually changes. A
  // named preset is a plain lookup and needs no memo.
  const customPalette = useMemo(() => resolveSchoolTheme({ kind: "custom", brandColor }), [brandColor]);
  const check = useMemo(() => checkCustomBrandColor(brandColor), [brandColor]);
  const previewTheme = choice === "custom" ? customPalette : resolveSchoolTheme(pendingTheme);

  function handleHexChange(value: string) {
    setHexText(value);
    if (!hexError(value)) setBrandColor(toSixDigitHex(value));
  }

  function handlePickerChange(value: string) {
    const hex = toSixDigitHex(value);
    setHexText(hex);
    setBrandColor(hex);
  }

  function handleSave() {
    if (error) return;
    startTransition(async () => {
      const result = await updateSchoolTheme(pendingTheme);
      if (result.ok) {
        toast("Appearance saved. Everyone at your school will see this theme.");
      } else {
        toast.error(result.formError);
      }
    });
  }

  return (
    // Phone order is choose → preview → save, so the preview is seen before
    // committing. From lg the preview moves into a right-hand column beside
    // the choices (spanning both rows) and Save sits under the choices; the
    // `1fr` second row soaks up any extra preview height so Save doesn't drift.
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:grid-rows-[auto_1fr] xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
      <style
        dangerouslySetInnerHTML={{
          __html: PRESET_SWATCH_CSS + presetToScopedCss(customPalette, presetSwatchSelector("custom")),
        }}
      />

      <div className="flex flex-col gap-4">
        <RadioGroup
          value={choice}
          onValueChange={(next) => setChoice(next as Choice)}
          aria-label="School color theme"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {themePresets.map((preset) => (
            <ThemeOption key={preset.id} value={preset.id} name={preset.name} />
          ))}
          <ThemeOption value="custom" name="Custom" description="Pick your school's own brand color" />
        </RadioGroup>

        {choice === "custom" ? (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={HEX_INPUT_ID} className="text-foreground">
                Brand color
              </Label>
              <div className="flex items-center gap-2">
                {/* The native picker and the text box edit the same value — the
                    picker for pointing and choosing, the text box for pasting a
                    brand guide's exact hex code. */}
                <input
                  type="color"
                  value={brandColor}
                  onChange={(event) => handlePickerChange(event.target.value)}
                  aria-label="Choose brand color"
                  className="size-11 shrink-0 cursor-pointer rounded-lg border border-input bg-transparent p-1"
                />
                <Input
                  id={HEX_INPUT_ID}
                  size="lg"
                  value={hexText}
                  onChange={(event) => handleHexChange(event.target.value.trim())}
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? HEX_ERROR_ID : CONTRAST_STATUS_ID}
                  className="max-w-40 font-mono uppercase"
                />
              </div>
              {error ? (
                <p id={HEX_ERROR_ID} className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <div id={CONTRAST_STATUS_ID} aria-live="polite">
              {error ? null : check.adjusted ? (
                <AdjustedNotice brandColor={brandColor} check={check} />
              ) : (
                <p className="flex items-start gap-2 text-sm text-foreground">
                  <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-status-present" />
                  <span>
                    Passes the readability check: button text contrast is {check.ratio.toFixed(1)}:1 (the minimum is
                    4.5:1).
                  </span>
                </p>
              )}
            </div>
          </div>
        ) : null}

      </div>

      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <ThemePreview theme={previewTheme} />
      </div>

      <div className="self-start lg:col-start-1">
        <Button type="button" onClick={handleSave} disabled={isPending || !dirty || Boolean(error)}>
          {isPending ? "Saving…" : "Save theme"}
        </Button>
      </div>
    </div>
  );
}

function ThemeOption({ value, name, description }: { value: Choice; name: string; description?: string }) {
  const id = `appearance-theme-${value}`;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border px-4 py-3 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent/40">
      <RadioGroupItem value={value} id={id} className="mt-0.5" />
      <Label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-1.5">
        <span className="text-sm text-foreground">{name}</span>
        {description ? <span className="text-xs font-normal text-muted-foreground">{description}</span> : null}
        <PresetSwatch id={value} />
      </Label>
    </div>
  );
}

function AdjustedNotice({
  brandColor,
  check,
}: {
  brandColor: string;
  check: ReturnType<typeof checkCustomBrandColor>;
}) {
  return (
    <div className="flex flex-col gap-3 text-sm text-foreground">
      <p className="flex items-start gap-2">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-status-late" />
        <span>
          This color is too light for readable button text, so buttons will use a darker shade of it (contrast{" "}
          {check.ratio.toFixed(1)}:1, the minimum is 4.5:1).
        </span>
      </p>
      {/* The school's own color data, not a styling choice — inline styles
          are the only way to show an arbitrary color the school typed in. */}
      <div className="flex flex-wrap gap-4 pl-6">
        <ColorSample label="Your color" background={brandColor} />
        <ColorSample label="Buttons use" background={check.buttonColor} foreground={check.buttonTextColor} />
      </div>
    </div>
  );
}

function ColorSample({ label, background, foreground }: { label: string; background: string; foreground?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-md border border-border text-sm font-medium"
        style={{ backgroundColor: background, color: foreground }}
      >
        {foreground ? "Aa" : null}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
