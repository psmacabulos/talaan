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
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (process.env.NODE_ENV === "production" && process.env.E2E !== "1") {
    const { checkProductionEnv } = await import("@/lib/env");
    const problems = checkProductionEnv(process.env);
    if (problems.length > 0) {
      throw new Error(`The server can't start with these settings:\n- ${problems.join("\n- ")}`);
    }
  }

  // Never while building: a build has no business sending pushes.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { startDefaultPushWorker } = await import("@/services/push/start");
  startDefaultPushWorker();
}
