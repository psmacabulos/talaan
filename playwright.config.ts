import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
import { e2eDatabaseUrl } from "./e2e/database";
import { TEST_SESSION_SECRET } from "./e2e/sessions";

const PORT = 3100;

/**
 * Browser tests run against a production build (`npm run build` first), the
 * same code a school would actually get, on its own port so a running
 * `npm run dev` on 3000 doesn't collide with it.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // In CI, every test shares one running server (and its one in-memory mock
  // "database" — station.spec.ts/parent.spec.ts/a11y.spec.ts's tap-station
  // tests all draw from the same finite pool of untapped students). Running
  // several tests at once there means their tap-station clicks race for the
  // same pool and pick different students than the tests expect. A single
  // worker removes that race entirely; locally, `reuseExistingServer` means
  // this doesn't apply and Playwright picks its normal parallel default.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 780 },
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    // The app under test reads and writes the test database, not your own,
    // and runs on the demo morning's clock (src/lib/clock.ts), so every run
    // sees the same day as the seed data whatever today's date is. Its own
    // session secret lets the tests make signed cookies (e2e/sessions.ts).
    // E2E=1 lets this production server start with those test settings,
    // which a live server refuses (src/instrumentation.ts).
    env: {
      E2E: "1",
      DATABASE_URL: e2eDatabaseUrl(),
      DEMO_NOW: "2026-06-19T09:15:00+08:00",
      SESSION_SECRET: TEST_SESSION_SECRET,
      // Pushes are made and "sent" to the log, never to Expo (Step 54).
      PUSH_SENDER: "log",
    },
    timeout: 120_000,
  },
});
