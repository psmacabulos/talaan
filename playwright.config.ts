import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * Browser tests run against a production build (`npm run build` first), the
 * same code a school would actually get, on its own port so a running
 * `npm run dev` on 3000 doesn't collide with it.
 */
export default defineConfig({
  testDir: "./e2e",
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
    timeout: 120_000,
  },
});
