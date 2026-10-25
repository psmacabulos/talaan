import { startBrowserErrorReporting } from "@/lib/browser-error-reporting";

/**
 * Runs in the browser before the page starts (Next.js's client
 * instrumentation): error reports for the staff screens, the parent pages
 * and the gate (Step 59), loaded once the page is up. Off without
 * `NEXT_PUBLIC_SENTRY_DSN`.
 */
startBrowserErrorReporting();
