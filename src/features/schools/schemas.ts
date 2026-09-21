import { z } from "zod";
import { themePresets, type ThemePresetId } from "@/lib/theme/presets";

// Derived from the real preset list (src/lib/theme/presets.ts) instead of a
// hand-copied array, so a new preset added there is automatically valid
// here too — nothing to keep in sync by hand.
const presetIds = themePresets.map((preset) => preset.id) as [ThemePresetId, ...ThemePresetId[]];

const HEX_COLOR_MESSAGE = "Enter a hex color like #223060";

/**
 * A school's theme is either one of the ready-made presets, or a single
 * brand color it supplied itself (Step 21's "Custom" picker generates a
 * full palette from this with src/lib/theme/contrast.ts's
 * generateCustomPalette, at the point the theme is actually applied).
 */
export const schoolThemeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("preset"), presetId: z.enum(presetIds) }),
  z.object({
    kind: z.literal("custom"),
    brandColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, HEX_COLOR_MESSAGE),
  }),
]);

/**
 * When a tap notifies a parent, set once per school by its principal or
 * super admin — never per parent. SMS is the actual notification channel
 * (Phase 2, provider chosen later); this only decides *whether* and *when*,
 * not *how*, so a later channel (push) can reuse the same preference.
 */
export const notificationPreferenceSchema = z.enum(["off", "time_in_only", "time_in_and_time_out"]);

export const schoolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Enter a school name"),
  theme: schoolThemeSchema,
  logoUrl: z.url().optional(),
  // The DepEd logo needs permission that's still pending — off unless a
  // school explicitly turns it on. See CLAUDE.md's domain rules.
  showDepedLogo: z.boolean(),
  notificationPreference: notificationPreferenceSchema,
});
