/**
 * The database the browser tests use: a separate one from your everyday
 * `DATABASE_URL`, so a test run never wipes data you were working with.
 */
export function e2eDatabaseUrl(): string {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) {
    throw new Error("Set E2E_DATABASE_URL in .env (see .env.example) before running the browser tests.");
  }
  return url;
}
