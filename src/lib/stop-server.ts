/**
 * Ends the server process on purpose (Step 59.1, P-010), so Heroku marks the
 * dyno crashed, shows the "down for a moment" page and restarts it. Its own
 * module, imported only on Node.js: Next.js also builds `instrumentation.ts`
 * for the Edge runtime, which has no `process.exit`.
 */
export function stopServer(error: Error): never {
  console.error(error);
  process.exit(1);
}
