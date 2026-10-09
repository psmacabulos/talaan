import { execSync } from "node:child_process";
import { e2eDatabaseUrl } from "./database";

/**
 * Runs once before all browser tests: brings the test database's tables up
 * to date, then resets it to the demo data. The tests add students, link
 * cards and tap in, and those changes now stay in Postgres between runs,
 * so without this a second run would start from the first run's leftovers.
 */
export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: e2eDatabaseUrl() };
  execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
  execSync("npm run db:reset", { env, stdio: "inherit" });
}
