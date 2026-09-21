import { presetToCss } from "./apply-preset";
import type { ThemeColorTokens } from "./presets";

/**
 * Renders a resolved light/dark token pair as a <style> tag, server-side,
 * before anything else paints — see apply-preset.ts for why that alone is
 * enough to avoid a flash. The root layout renders one with the app's
 * default tokens; (app)/layout.tsx (Step 11) renders a second one, with a
 * different `id`, carrying the signed-in school's actual resolved theme
 * (src/lib/theme/active-theme.ts) — being later in the HTML source, it wins
 * the `:root:root` specificity tie for every page inside the shell, while
 * standalone pages outside it (/, /design-system) keep just the default.
 */
export function ThemePresetStyle({
  tokens,
  id = "theme-preset",
}: {
  tokens: { light: ThemeColorTokens; dark: ThemeColorTokens };
  id?: string;
}) {
  return (
    <style
      id={id}
      // Raw, hardcoded CSS text (never user input) — dangerouslySetInnerHTML
      // is used so the string is set verbatim, not HTML-escaped.
      dangerouslySetInnerHTML={{ __html: presetToCss(tokens) }}
    />
  );
}
