import { tokensToScopedCss } from "@/lib/theme/apply-preset";
import type { ResolvedTheme } from "@/lib/theme/active-theme";

type Mode = "light" | "dark";

const MODES: { mode: Mode; label: string }[] = [
  { mode: "light", label: "Light mode" },
  { mode: "dark", label: "Dark mode" },
];

function tileSelector(mode: Mode): string {
  return `[data-theme-preview-tile="${mode}"]`;
}

/**
 * Step 26's live preview on Settings > Appearance: a tiny sample screen,
 * drawn twice — once with the theme's light tokens, once with its dark
 * ones — so a principal sees both before saving, whichever mode their own
 * browser is in. Each tile gets its own scoped copy of the token variables
 * (tokensToScopedCss), the same mechanism as the preset swatches; the page
 * around it keeps the school's current saved theme until Save.
 *
 * Every element sets its own color utility rather than inheriting one: a
 * CSS variable resolves where the property is declared, so an inherited
 * `color` would carry the page's theme into the tile, not the tile's own.
 */
export function ThemePreview({ theme }: { theme: ResolvedTheme }) {
  const css = MODES.map(({ mode }) => tokensToScopedCss(theme[mode], tileSelector(mode))).join("");

  return (
    <figure className="flex flex-col gap-2">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <figcaption className="text-xs font-medium text-muted-foreground">Live preview</figcaption>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {MODES.map(({ mode, label }) => (
          <PreviewTile key={mode} mode={mode} label={label} />
        ))}
      </div>
    </figure>
  );
}

function PreviewTile({ mode, label }: { mode: Mode; label: string }) {
  return (
    <div
      data-theme-preview-tile={mode}
      className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 text-foreground"
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {/* A sample of real UI, not real data — hidden from screen readers so
          it isn't read out as if it were this school's numbers. */}
      <div aria-hidden="true" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Present today</span>
            <span className="font-heading text-2xl font-semibold text-card-foreground">482</span>
          </div>
          <span className="rounded-full bg-highlight px-2 py-0.5 text-xs font-medium text-highlight-foreground">
            Flagged
          </span>
        </div>
        <span className="w-fit rounded-md bg-accent px-2 py-0.5 text-xs text-accent-foreground">Grade 10 · Rizal</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
            Save changes
          </span>
          <span className="text-sm text-link underline underline-offset-4">View all</span>
        </div>
        <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Last tap 7:42 AM</div>
      </div>
    </div>
  );
}
