# Step 34: Give CI its own Postgres

## Why

In Step 35 the app starts reading schools from the database. From then on, CI's Playwright tests (which start the real app) need a database too, or every page fails. This step adds that database to CI **before** the app needs it, so every commit stays green.

It's also useful on its own. On every push, CI now starts from a completely empty Postgres, applies every migration in order, and runs the seed. If a migration is broken, or only works on your laptop because of leftover data there, CI catches it before Heroku ever sees it.

```mermaid
flowchart TB
    subgraph runner["GitHub Actions runner (fresh every push)"]
        direction TB
        Svc[("service: postgres:18<br/>localhost:5432, empty")]
        Install["npm ci<br/>→ postinstall: prisma generate"]
        Migrate["npx prisma migrate deploy<br/>applies prisma/migrations/*"]
        SeedStep["npx prisma db seed<br/>3 demo schools"]
        Checks["lint · check:tokens · typecheck<br/>test · build · Playwright"]
        Install --> Migrate --> SeedStep --> Checks
        Migrate --> Svc
        SeedStep --> Svc
        Checks -.->|"from Step 35"| Svc
    end
```

**`migrate deploy`, not `migrate dev`.** `deploy` only *applies* migration files that already exist. It never creates new ones, never asks questions and never resets anything. That's what you want anywhere that isn't your own laptop: CI now, and Heroku later.

## What you'll need

- Step 33 done and committed: `postinstall` runs `prisma generate`, and `prisma/seed.ts` works.
- The repo pushed to GitHub, as before. You'll push this step's commit to see it run.

## Steps

### 1. Add a Postgres service and the connection string

Open `.github/workflows/ci.yml`. Under `jobs:` → `checks:`, right after `runs-on: ubuntu-latest`, add `services` and `env`, so the top of the job reads:

```yaml
jobs:
  checks:
    runs-on: ubuntu-latest

    # A throwaway Postgres for this run only, the same version as local
    # (Step 30) and Heroku. Deleted when the job ends.
    services:
      postgres:
        image: postgres:18
        env:
          POSTGRES_PASSWORD: devpassword
          POSTGRES_DB: talaan
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10

    env:
      DATABASE_URL: postgresql://postgres:devpassword@localhost:5432/talaan

    steps:
```

**Why each part:**
- `services:` starts a Docker container next to the job, the same idea as your `docker run` in Step 30, but GitHub runs it for you and deletes it afterwards.
- `env` under `postgres:` is the same `POSTGRES_PASSWORD` / `POSTGRES_DB` you used locally.
- `ports: - 5432:5432` makes it reachable at `localhost:5432` from the job's steps, the same as `-p 5432:5432` locally.
- `options: --health-cmd pg_isready …`: Postgres takes a few seconds to start. `pg_isready` is Postgres's own "are you accepting connections yet?" check. GitHub waits until it passes before running any step, so the first migration doesn't race a database that isn't up yet.
- The job-level `env: DATABASE_URL` is visible to every step, so Prisma, the build and Playwright all find the database. The password is a throwaway for a container that exists for a few minutes, so it's fine to have it in plain text here. A real secret would go in GitHub's encrypted **Secrets** instead.
- The `>-` after `options:` is YAML for "join the next lines into one line".

**YAML is whitespace-sensitive.** Use spaces, never tabs, and keep the indentation exactly as shown: `services:` and `env:` line up with `runs-on:`.

### 2. Apply migrations and seed, right after installing

Find the existing `Install dependencies` step and add a new step directly below it:

```yaml
      - name: Install dependencies
        run: npm ci

      - name: Set up the database
        run: |
          npx prisma migrate deploy
          npx prisma db seed
```

**Why here:** `npm ci` already generated the client (Step 33's `postinstall`). Setting up the database straight away makes a broken migration fail in the first minute, rather than after the long build and Playwright steps. The `|` lets one step run several commands, one per line.

### 3. Check the file before pushing

```bash
npx prettier --check .github/workflows/ci.yml
```

Prettier understands YAML, so this catches bad indentation before GitHub does. If it complains, `npx prettier --write .github/workflows/ci.yml` fixes the formatting. Then reread the file to make sure the structure is still what you meant.

## Verify it worked

1. Commit this step and push.
2. On GitHub, open the repo → **Actions** → the newest run of **CI**.
3. Open the **Set up the database** step. You should see:

   ```
   All migrations have been successfully applied.
   …
   Seeded 3 schools:
   - school-balanga: Balanga City National Science High School (time_in_and_time_out)
   …
   ```

4. The whole run is green, the same as before this step. Nothing else uses the database yet.

Then tell me what you saw (or paste the failing step's log).

## If something goes wrong

- **`Invalid workflow file` / `did not find expected key`** on the Actions page: indentation. Compare your file with steps 1 and 2 space by space. Tabs are a common cause.
- **`Can't reach database server at localhost:5432`** in "Set up the database": the `ports:` mapping is missing or misspelled, or `services:` isn't nested under the `checks:` job.
- **`The datasource.url property is required`**: the job-level `env:` block is missing, or it's nested under a single step instead of the job.
- **`Authentication failed`**: the password in `DATABASE_URL` doesn't match the service's `POSTGRES_PASSWORD`.
- **`Cannot find module '@/generated/prisma/client'`** in Typecheck: `postinstall` is missing from `package.json` (Step 33, step 4).
- **`sh: 1: tsx: not found`** in the seed: `tsx` must be in `devDependencies` (Step 33, step 1). `npm ci` installs dev dependencies, so check that it's listed there.

## What you just learned

- **Service containers:** CI can run its own database next to your tests, created fresh and thrown away on every run.
- **`migrate deploy`:** the non-interactive, apply-only migration command for everywhere except your own laptop.
- **Health checks:** wait until a service is actually ready, instead of just started, before using it.

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

Step 35 swaps the school repository from the mock array to a real Prisma-backed one. That's the first time the app itself reads and writes the database.
