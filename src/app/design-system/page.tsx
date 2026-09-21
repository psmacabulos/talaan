import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { PageHeader } from "@/components/page-header";
import { presetToScopedCss } from "@/lib/theme/apply-preset";
import { getThemePreset, themePresets } from "@/lib/theme/presets";
import { StyleGuideContent } from "./_components/style-guide-content";

export const metadata: Metadata = {
  title: "Design system — Talaan",
};

const PREVIEW_SELECTOR = "[data-design-system]";

/**
 * The living style guide (CLAUDE.md's design-system rule 10): every token
 * and shared component, for checking a theme change before it ships. Scoped
 * to this page's own content via presetToScopedCss/PREVIEW_SELECTOR — same
 * mechanism the Step 5/6 homepage demo already proved out — so switching
 * `?preset=` here never touches the rest of the app. Color mode (light/dark)
 * comes from the real ThemeToggle, so every combination is rendered exactly
 * as the real app would, not a simulated approximation.
 *
 * Dev-only: unreachable once NODE_ENV is "production" (checked in code, not
 * routing config, so it can't accidentally ship even if middleware changes
 * later).
 */
export default async function DesignSystemPage({ searchParams }: PageProps<"/design-system">) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const params = await searchParams;
  const requestedPreset = typeof params.preset === "string" ? params.preset : undefined;
  const preset = getThemePreset(requestedPreset);
  const previewCss = presetToScopedCss(preset, PREVIEW_SELECTOR);

  return (
    <div data-design-system className="min-h-full bg-background px-6 py-10 text-foreground sm:px-10">
      {/* Raw, hardcoded CSS text (never user input) — dangerouslySetInnerHTML
          is used so the string is set verbatim, not HTML-escaped. */}
      <style dangerouslySetInnerHTML={{ __html: previewCss }} />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <PageHeader
          title="Design system"
          description="Every token and shared component, for checking a theme change. Dev-only — this page 404s in production."
          actions={<ThemeToggle />}
        />

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
          <span className="font-medium text-muted-foreground">Preset:</span>
          {themePresets.map((option) => (
            <a
              key={option.id}
              href={`/design-system?preset=${option.id}`}
              className={
                option.id === preset.id
                  ? "rounded-md bg-primary px-2.5 py-1 text-primary-foreground"
                  : "rounded-md px-2.5 py-1 text-link underline underline-offset-2 hover:bg-muted"
              }
            >
              {option.name}
            </a>
          ))}
        </div>

        <StyleGuideContent />
      </div>
    </div>
  );
}
