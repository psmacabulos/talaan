/**
 * The browser's side of error reports (Step 59). Sentry's code is loaded
 * only once the page has finished loading, and only when reports are on,
 * so it never slows a page's first screen: about 31 KB (compressed) that a
 * phone would otherwise fetch before showing anything. An error in the
 * page's very first moment isn't reported; anything after is.
 */
import type { ProblemReport } from "./error-reporting";

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
export function reportBrowserError(error: unknown, reference?: string): void {
  if (!DSN || hasDigest(error)) return;
  void load().then((reporting) => reporting?.reportError(error, reference));
}

function hasDigest(error: unknown): boolean {
  return error instanceof Error && "digest" in error && typeof error.digest === "string";
}

/**
 * Whether "Report this problem" has anywhere to send to: a live build with
 * reports on. Under `npm run dev` it shows too, so every state of the
 * dialog can be seen; a production build without reports hides it.
 */
export function canSendProblemReports(): boolean {
  return Boolean(DSN) || process.env.NODE_ENV === "development";
}

/**
 * Sends "Report this problem" (Step 59.1), loading Sentry first if the page
 * hasn't yet. Where reports are off (development), it's only printed to the
 * browser's console. Rejects when it couldn't be sent, so the dialog can say so.
 */
export async function sendBrowserProblemReport(report: ProblemReport): Promise<void> {
  if (!DSN || process.env.NODE_ENV !== "production") {
    console.info("Problem report (not sent: reports are off here):", report);
    return;
  }
  const reporting = await load();
  if (!reporting) throw new Error("Error reports couldn't be loaded");
  await reporting.sendProblemReport(report, window.location.href);
}
