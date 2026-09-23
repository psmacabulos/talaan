export const MAIN_CONTENT_ID = "main-content";

/**
 * The first thing Tab reaches on a page with navigation: hidden until
 * focused, then it jumps keyboard and screen-reader users past the sidebar
 * or header straight to the page's own content (WCAG 2.4.1 Bypass Blocks).
 */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only rounded-md border border-border bg-background text-sm font-medium text-foreground shadow-md outline-none focus:not-sr-only focus:fixed focus:px-4 focus:py-2.5 focus:top-3 focus:left-3 focus:z-50 focus-visible:ring-2 focus-visible:ring-ring"
    >
      Skip to main content
    </a>
  );
}
