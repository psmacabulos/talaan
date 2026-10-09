# Step 36: Give the browser tests their own database, reset before every run

## Why

Until now, every `npx playwright test` run started with a clean slate for free: the mock data lived in memory, and the test server was a fresh process each time. From Step 35 on, data lives in Postgres, and Postgres keeps everything. That's the point of a database, but it's a problem for tests:

- The browser tests **add students, replace cards, tap in and sign up parents**. Once those move to Postgres (Steps 37–40), every run leaves its changes behind.
- The tap-station tests pick "the next student who hasn't tapped in yet" from a small pool of seeded students. Each run uses some up. Without a reset, after a few runs the pool is empty and the tests fail with "Nothing to simulate", even though the code is fine.
- Running tests against your everyday database would also wipe out whatever you were trying in `npm run dev`.

So this step gives the tests **their own database** (`talaan_test`, in the same Docker container) and **resets it to the demo data before every run**. It goes before the remaining repository swaps so each of those steps can be tested twice in a row safely.

```mermaid
flowchart TB
    Run["npx playwright test"]
    Setup["e2e/global-setup.ts<br/>runs once, before any test"]
    Migrate["npx prisma migrate deploy<br/>(creates talaan_test the first time)"]
    Reset["npm run db:reset<br/>empty every table, insert demo data"]
    Server["npm run start on port 3100<br/>DATABASE_URL = E2E_DATABASE_URL"]
    Tests["the tests"]
    TestDB[("talaan_test")]
    DevDB[("talaan<br/>your npm run dev data, untouched")]
    Run --> Setup --> Migrate --> TestDB
    Setup --> Reset --> TestDB
    Run --> Server --> TestDB
    Tests --> Server
```

## What you'll need

- Step 35 done and approved.
- `talaan-postgres` running.

## Steps

### Part A: move the seeding into a reusable function

Right now all the seeding lives inside `prisma/seed.ts`'s `main()`. The reset script needs the exact same "insert the demo data" code, and importing `seed.ts` would *run* it. So move the inserting into its own file that only *exports* functions.

Create `prisma/demo-data.ts`:

```ts
import type { PrismaClient } from "@/generated/prisma/client";
import { seedSchools } from "@/data/seed";
import { toSchoolData } from "@/data/repositories/prisma-school-repository";

/**
 * Copies Phase 1's demo data into the database, keeping the same ids
 * ("school-balanga", ...) so the mock repositories that still point at
 * those ids keep lining up. Safe to run again: each insert skips a row
 * that already exists instead of failing on a duplicate id.
 *
 * Shared by `prisma/seed.ts` (adds what's missing) and
 * `prisma/reset-demo.ts` (empties the tables first).
 */
export async function insertDemoData(db: PrismaClient) {
  // One at a time, in seed order: each row gets its own createdAt, so
  // lists come back in the same order the mock kept them.
  for (const school of seedSchools) {
    await db.school.upsert({
      where: { id: school.id },
      update: {},
      create: { id: school.id, ...toSchoolData(school) },
    });
  }
}

/** One line per table, so you can see at a glance what's in the database. */
export async function printDemoDataSummary(db: PrismaClient) {
  console.log(`Schools: ${await db.school.count()}`);
}
```

**Why `toSchoolData`:** Step 35's repository already knows how to turn a `School` into database columns. Reusing it means the seed and the app can never disagree about that (for example, `logoUrl: undefined` → `null`). Each later step adds its own table here the same way.

**Why `db` is a parameter:** same "pass in your dependency" shape as `createPrismaSchoolRepository(db)`. The function doesn't care which `PrismaClient` it's handed.

### Part B: make `seed.ts` call it

Replace all of `prisma/seed.ts` with:

```ts
import "dotenv/config";
import { prisma } from "@/lib/db";
import { insertDemoData, printDemoDataSummary } from "./demo-data";

async function main() {
  await insertDemoData(prisma);
  await printDemoDataSummary(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
```

`npx prisma db seed` still does exactly what it did: adds missing schools and leaves existing ones alone. Only the printout is shorter (`Schools: 3`).

### Part C: the reset script

Create `prisma/reset-demo.ts`:

```ts
import "dotenv/config";
import { prisma } from "@/lib/db";
import { insertDemoData, printDemoDataSummary } from "./demo-data";

/**
 * Empties every table and puts the demo data back, so the browser tests
 * always start from the same known state. Refuses to touch anything but a
 * database on this machine: a reset must never reach a real school's data.
 */
async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) {
    throw new Error("Refusing to reset: DATABASE_URL isn't a database on localhost.");
  }

  // Every table links back to School, so CASCADE empties them all.
  await prisma.$executeRaw`TRUNCATE "School" CASCADE`;
  await insertDemoData(prisma);

  console.log("Reset the demo data.");
  await printDemoDataSummary(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
```

Then in `package.json`'s `"scripts"`, add this line after `"check:tokens"`:

```json
"db:reset": "tsx prisma/reset-demo.ts",
```

**Why each part:**
- **`TRUNCATE`** empties a table in one go, much faster than deleting row by row. **`CASCADE`** also empties every table with a foreign key pointing at it. From Step 37 on, every table links back to `School`, so this one line keeps emptying all of them as tables get added. You never have to update it.
- **`$executeRaw`** sends plain SQL. Prisma has no "truncate" method, so this is the right tool. It's a *tagged template* (backticks right after the name, no parentheses), which Prisma uses to keep values safely separated from the SQL.
- **The localhost check** is a seatbelt. One day there will be a production `DATABASE_URL` (Heroku). A script that empties every table should refuse to run against anything that isn't on your own machine, even if someone runs it by mistake.
- **Why not `prisma migrate reset`?** It also empties the database, but by dropping and rebuilding everything from the migrations, which is slower and noisier, and it asks for confirmation every time. A plain `TRUNCATE` script does only what's needed and works the same everywhere.

### Part D: the test-database helpers

Create `e2e/database.ts`:

```ts
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
```

Create `e2e/global-setup.ts`:

```ts
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
```

**Why each part:**
- **Global setup** is Playwright's hook for "do this once before the whole run". It's the right place for slow, shared preparation like this.
- **`env: { ...process.env, DATABASE_URL: … }`** runs those two commands with `DATABASE_URL` swapped for the test database. `prisma.config.ts` and `src/lib/db.ts` both read `DATABASE_URL`, and `dotenv` never overwrites a variable that's already set. So the swap wins over your `.env` without any change to those files.
- **`migrate deploy` first** creates `talaan_test` the very first time (it creates a missing database by itself) and applies any new migration after that. Each later step's new table reaches the test database without you doing anything.
- **`stdio: "inherit"`** shows the commands' output in your terminal, so if the reset fails you see why.

### Part E: point Playwright at the test database

In `playwright.config.ts`, make three changes.

**E1.** At the very top, above the existing import:

```ts
import "dotenv/config";
```

and below the existing `@playwright/test` import:

```ts
import { e2eDatabaseUrl } from "./e2e/database";
```

`dotenv/config` loads `.env` so `E2E_DATABASE_URL` is available here. Playwright doesn't read `.env` by itself.

**E2.** Right after `testDir: "./e2e",` add:

```ts
  globalSetup: "./e2e/global-setup.ts",
```

**E3.** In the `webServer` block, right after `reuseExistingServer: !process.env.CI,` add:

```ts
    // The app under test reads and writes the test database, not your own.
    env: { DATABASE_URL: e2eDatabaseUrl() },
```

`webServer.env` sets extra environment variables for the `npm run start` that Playwright launches, on top of your normal ones. Next.js loads `.env` too, but like `dotenv` it never overwrites a variable that's already set, so the app under test uses `talaan_test`.

### Part F: the new environment variable

**F1.** At the end of `.env.example` add:

```bash

# A separate database for the browser tests (Playwright). Every test run
# empties it and refills it with demo data — see e2e/global-setup.ts.
E2E_DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/talaan_test"
```

**F2.** Add the same `E2E_DATABASE_URL=…` line to your own `.env`. It's the same as your `DATABASE_URL`, except the database name at the end is `talaan_test`.

### Part G: tell CI

In `.github/workflows/ci.yml`, in the job-level `env:` block, under `DATABASE_URL`, add:

```yaml
      # CI's database is thrown away after the run, so the browser tests can
      # reset this same one.
      E2E_DATABASE_URL: postgresql://postgres:devpassword@localhost:5432/talaan
```

In CI there's nothing to protect: the whole database disappears when the job ends. So the tests simply reset the same one.

## Verify it worked

1. The seed still works, twice in a row:

   ```bash
   npx prisma db seed
   npx prisma db seed
   ```

   Both print `Schools: 3`.

2. The reset works on your dev database too:

   ```bash
   npm run db:reset
   ```

   Prints `Reset the demo data.` then `Schools: 3`. (This puts the schools' settings back to the demo values. That's fine. It's demo data.)

3. The seatbelt works:

   ```bash
   DATABASE_URL="postgresql://u:p@db.example.com:5432/talaan" npm run db:reset
   ```

   Fails with `Refusing to reset: DATABASE_URL isn't a database on localhost.` and nothing is touched.

4. The browser tests run against `talaan_test`, twice:

   ```bash
   npm run build
   npx playwright test
   npx playwright test
   ```

   At the start of each run you'll see the migrations and `Reset the demo data.` Both runs pass.

5. The test database exists next to yours:

   ```bash
   docker exec -it talaan-postgres psql -U postgres -c '\l'
   ```

   The list shows both `talaan` and `talaan_test`. This is the usual `psql` command with two changes: no `-d` (just list the databases, don't open one) and `-c '\l'` (run this one command, then exit, instead of opening the `talaan=#` prompt). What each part means: [Learning log: getting into `psql`](../LEARNING-LOG.md#getting-into-psql-and-what-each-part-of-the-command-means-owner-question).

Then tell me what you saw (or paste the exact error).

## If something goes wrong

- **`Set E2E_DATABASE_URL in .env`** when running Playwright: Part F2 isn't done, or the line has a typo in its name.
- **`Can't reach database server at localhost:5432`** during global setup: Docker or the container isn't running. `docker start talaan-postgres`.
- **`Refusing to reset`** on your own machine: your URL says something other than `localhost` or `127.0.0.1` (for example your computer's name). Use `localhost`.
- **The tests pass, but your `npm run dev` data was reset too:** `E2E_DATABASE_URL` in `.env` still ends in `/talaan`. It must end in `/talaan_test`.
- **`tsx: command not found`** for `db:reset`: run `npm install` (tsx came in with Step 33).
- **Playwright says the port 3100 is already in use:** an older test server is still running. Close the terminal that started it, or find it with `lsof -i :3100` and stop it.

## What you just learned

- **Tests need a known starting point.** Mock data reset itself on every restart. A real database doesn't, so a test run has to put it back on purpose.
- **Separate databases for separate jobs.** Your dev data and your test data live in the same Postgres server but in different databases, so neither can damage the other.
- **Environment variables choose the database.** The code never names a database. Swapping `DATABASE_URL` for one process is how the same app talks to `talaan`, `talaan_test` or (later) production.
- **`TRUNCATE … CASCADE`** empties tables fast, following foreign keys.
- **Guard dangerous scripts.** Anything that deletes data checks where it's pointed before doing it.

## Before you commit

Run these once "Verify it worked" passes. They're the same checks CI runs, in the same order. [docs/LEARNING-LOG.md](../LEARNING-LOG.md#the-routine-to-run-before-every-commit-and-push-owner-question) explains what each one catches.

```bash
docker start talaan-postgres
npm run lint && npm run check:tokens && npm run typecheck && npm run test && npm run build
```

Before you push, also run the browser tests. They take a few minutes and use the build from the line above:

```bash
npx playwright test
```

If one fails, fix it and rerun that one command, then rerun the whole line before committing. If you're stuck, share the exact error.

## What's next

Step 37 moves staff into Postgres, the first table that links to another one.
