import { useId } from "react";
import { PRODUCT_NAME } from "@/lib/product";
import { cn } from "@/lib/utils";
import { MARK, MARK_VIEWBOX } from "./mark-shapes";

/**
 * The Bantay Aral mark (Step 51.6), drawn from the `--brand-*` tokens, so it
 * follows light and dark mode: a blue parent in light, a white one on navy.
 * Decorative by default; `BantayAralLogo` gives the name to screen readers.
 */
export function BantayAralMark({ className }: { className?: string }) {
  const gradientId = useId();
  const { parentHead: h, childHead: c, parentGradient: g } = MARK;
  return (
    <svg viewBox={MARK_VIEWBOX} aria-hidden="true" focusable="false" className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1={g.y1} x2="0" y2={g.y2} gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--brand-parent-top)" }} />
          <stop offset="1" style={{ stopColor: "var(--brand-parent)" }} />
        </linearGradient>
      </defs>
      <circle cx={h.cx} cy={h.cy} r={h.r} className="fill-brand-parent-top" />
      <path d={MARK.parentBody} fill={`url(#${gradientId})`} />
      <circle cx={c.cx} cy={c.cy} r={c.r} className="fill-brand-child" />
      <path d={MARK.pageLight} className="fill-brand-page-light" />
      <path d={MARK.pageChild} className="fill-brand-child" />
      <path d={MARK.pageDeep} className="fill-brand-page-deep" />
      {MARK.edges.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          strokeWidth={MARK.edgeWidth}
          strokeLinecap="round"
          className="stroke-brand-edge"
        />
      ))}
      {MARK.rays.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          strokeWidth={MARK.rayWidth}
          strokeLinecap="round"
          className="stroke-brand-sun"
        />
      ))}
    </svg>
  );
}

/** The brand's line, from the owner's brand sheet. */
export const BRAND_TAGLINE = "Every school day, connected with care.";

const SIZES = {
  sm: { mark: "h-8 w-auto", word: "text-lg", tagline: "text-[0.6875rem]" },
  md: { mark: "h-11 w-auto", word: "text-2xl", tagline: "text-xs" },
  lg: { mark: "h-16 w-auto", word: "text-4xl", tagline: "text-sm" },
} as const;

/**
 * The full logo: the mark, then "BantayAral" in Lexend, with "Aral" in the
 * brand's green. The wordmark joins the two words, as the brand sheet does;
 * screen readers hear the product's name, "Bantay Aral".
 */
export function BantayAralLogo({
  size = "md",
  tagline = false,
  className,
}: {
  size?: keyof typeof SIZES;
  /** "Every school day, connected with care." under the name. */
  tagline?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span role="img" aria-label={PRODUCT_NAME} className={cn("inline-flex items-center gap-2.5", className)}>
      <BantayAralMark className={s.mark} />
      <span aria-hidden="true" className="flex flex-col">
        <span className={cn("font-heading leading-none font-bold tracking-tight", s.word)}>
          <span className="text-brand-ink">Bantay</span>
          <span className="text-brand-green-text">Aral</span>
        </span>
        {tagline ? (
          <span className={cn("mt-1 leading-tight text-muted-foreground", s.tagline)}>{BRAND_TAGLINE}</span>
        ) : null}
      </span>
    </span>
  );
}
