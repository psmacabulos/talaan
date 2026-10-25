/**
 * The browser's side of error reports (Step 59). Sentry's code is loaded
 * only once the page has finished loading, and only when reports are on,
 * so it never slows a page's first screen: about 31 KB (compressed) that a
 * phone would otherwise fetch before showing anything. An error in the
 * page's very first moment isn't reported; anything after is.
 */
const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Sentry's code, loaded once. Null when it can't be fetched (an offline gate): reports are then skipped, quietly. */
function load() {
  return import("./error-reporting")
    .then((reporting) => {
      reporting.startErrorReporting(DSN);
      return reporting;
    })
    .catch(() => null);
}

/** From `instrumentation-client.ts`: starts reports after the page's `load` event. */
export function startBrowserErrorReporting(): void {
  if (!DSN) return;
  if (document.readyState === "complete") void load();
  else window.addEventListener("load", () => void load(), { once: true });
}

/**
 * For error pages: an error a page's error boundary caught, which Sentry
 * wouldn't see by itself. One with a `digest` came from the server, which
 * already reported it with the full details (`onRequestError`): a second,
 * vaguer report would only use up the quota.
 */
export function reportBrowserError(error: Error & { digest?: string }): void {
  if (!DSN || error.digest) return;
  void load().then((reporting) => reporting?.reportError(error));
}
