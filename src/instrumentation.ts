/**
 * Runs once when the server starts, before it answers any request (Step 52).
 * A live server with a missing or dangerous setting stops here, with the
 * settings' names in the logs (`heroku logs`), instead of half-working.
 * The browser tests run a production server on purpose with test settings
 * (a pinned clock, photos in a local folder), so playwright.config.ts sets
 * E2E=1 to skip the check. Never set E2E on a real server.
 *
 * Then it starts the push worker (Step 54), everywhere: in development, the
 * browser tests and the live server alike.
 *
 * Error reports start first (Step 59), so a bad setting is reported too,
 * and the report is waited for before the process ends.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { flushReports, reportError, startErrorReporting } = await import("@/lib/error-reporting");
  startErrorReporting(process.env.NEXT_PUBLIC_SENTRY_DSN);

  const { checkProductionEnv, isLiveServer } = await import("@/lib/env");
  if (isLiveServer()) {
    const problems = checkProductionEnv(process.env);
    if (problems.length > 0) {
      const error = new Error(`The server can't start with these settings:\n- ${problems.join("\n- ")}`);
      reportError(error);
      await flushReports(2_000);
      // A build runs this too, and stays as it was: Next.js logs the throw.
      if (process.env.NEXT_PHASE === "phase-production-build") throw error;
      // On a running server, Next.js would catch a throw and keep answering
      // every request with a bare 500 (P-010). Ending the process instead
      // lets Heroku mark the dyno crashed, show the "down for a moment"
      // page (Step 59.1) and restart it.
      const { stopServer } = await import("@/lib/stop-server");
      stopServer(error);
    }
  }

  // Never while building: a build has no business sending pushes.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { startDefaultPushWorker } = await import("@/services/push/start");
  startDefaultPushWorker();
}

/** Every server error in a page, a Server Action or an API route goes to the error reports (Step 59). */
export { reportRequestError as onRequestError } from "@/lib/error-reporting";
