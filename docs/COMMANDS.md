# Commands cheat sheet

Every command this project needs, grouped by what you're doing, with what each one is for and which files are behind it, for troubleshooting. Run them from the project folder (`~/Documents/talaan`).

**Kept up to date:** whenever a step adds or changes a command, this page changes in the same commit.

## Contents
1. [Starting work for the day](#1-starting-work-for-the-day)
2. [The checks before every commit](#2-the-checks-before-every-commit)
3. [Unit tests (Vitest)](#3-unit-tests-vitest)
4. [Browser tests (Playwright)](#4-browser-tests-playwright)
5. [The database (Docker and Postgres)](#5-the-database-docker-and-postgres)
6. [Database changes (Prisma migrations)](#6-database-changes-prisma-migrations)
7. [The gate, the monitor and the USB reader](#7-the-gate-the-monitor-and-the-usb-reader)
8. [Git: saving your work](#8-git-saving-your-work)
9. [When something is stuck](#9-when-something-is-stuck)

---

## 1. Starting work for the day

```bash
docker start talaan-postgres   # 1. the database
npx prisma migrate deploy      # 2. any new database changes
npm run db:reset               # 3. (optional) fresh demo data
npm run dev                    # 4. the app, at http://localhost:3000
```

| Command | What it does |
|---|---|
| `docker start talaan-postgres` | Starts the local Postgres database. Docker Desktop must be open first. Safe to run if it's already running. |
| `npx prisma migrate deploy` | Applies any database change (migration) your database doesn't have yet. It never deletes data and never asks questions. It answers "No pending migrations" when there's nothing to do. |
| `npm run db:reset` | Empties the database and refills it with the demo data. **It also deletes gate and monitor devices**, so make new ones afterwards (section 7). It refuses to run on anything but your own laptop. |
| `npm run dev` | Runs the app with live reload. Stop it with `Ctrl+C`. After installing a package or a database change, stop it and start it again. |

**Files:** `.env` (your settings: `DATABASE_URL`, `SESSION_SECRET`, and optionally `DEMO_NOW`; see `.env.example` for every setting), `prisma/reset-demo.ts`, `prisma/demo-data.ts`, `src/data/seed/` (the demo students, cards and taps).

**Signing in (Step 50):** every staff page needs a signed-in session. In development, use the "Try the prototype as" buttons on the sign-in screen, or the "Preview as" menu in the top bar. Every active demo account's password is `Talaan123!` (the form checks it from Step 50.1). The browser tests sign in on their own.

**`SESSION_SECRET` (once, Step 50):** the secret that stamps sign-in cookies so they can't be faked. Make one and paste it into `.env`:

```bash
openssl rand -base64 32
```

```
SESSION_SECRET="<the 44 characters it printed>"
```

Without it, every staff page shows "SESSION_SECRET is missing or shorter than 32 characters". Changing it signs everyone out.

**`DEMO_NOW`:** leave it out of `.env` for real taps with the real time. Set it (`DEMO_NOW="2026-06-19T09:15:00+08:00"`) to see the demo morning, when the seed data's taps happened.

---

## 2. The checks before every commit

```bash
npm run lint && npm run check:tokens && npm run typecheck && npm test && npm run build
npm run test:e2e
```

`&&` means "run the next one only if this one passed", so the first failure stops the line, and its error is the last thing on screen. Fix it, rerun that one command, then the whole line.

| Command | What it catches | Files behind it |
|---|---|---|
| `npm run lint` | Code-style mistakes and common React bugs (ESLint). | `eslint.config.mjs` |
| `npm run check:tokens` | A raw colour (`#fff`, `bg-blue-500`) outside the theme files. | `scripts/check-tokens.mjs`, `src/styles/tokens.css` |
| `npm run typecheck` | TypeScript errors anywhere, even in files you didn't open. | `tsconfig.json` |
| `npm test` | The unit tests (section 3). | `vitest.config.ts` |
| `npm run build` | The real production build. It catches things `npm run dev` forgives. | `next.config.ts` |
| `npm run test:e2e` | Builds, then runs the browser tests (section 4). Takes about a minute. | `playwright.config.ts`, `e2e/` |
| `npm run test:a11y` | Builds, then runs the accessibility audit on every screen. | `e2e/a11y.spec.ts` |

The database must be running (section 5) for `build` and the browser tests. CI on GitHub runs the same checks on every push (`.github/workflows/ci.yml`).

---

## 3. Unit tests (Vitest)

Fast tests of single functions and components, with no browser and no database.

| Command | What it does |
|---|---|
| `npm test` | Runs every unit test once. |
| `npx vitest run src/features/gate` | Only the tests in one folder. |
| `npx vitest run src/features/gate/scan-buffer.test.ts` | Only one file. |
| `npx vitest run -t "duplicate"` | Only the tests whose name contains "duplicate". |
| `npx vitest` | Watch mode: reruns the tests whenever you save a file. `q` quits. |

**Files:** every `*.test.ts` / `*.test.tsx` next to the code it tests (for example `src/services/taps/record-tap.test.ts`), `vitest.config.ts`, `vitest.setup.ts`. More in `docs/TESTING.md`.

---

## 4. Browser tests (Playwright)

A real Chrome clicks through the app, at **phone width (`mobile`, 360 px)** and **desktop width (`desktop`, 1280 px)**, against its **own test database**, so your own data is never touched.

**Build first:** the tests run the built app, so after changing code, run `npm run build` (or use `npm run test:e2e`, which builds for you).

| Command | What it does |
|---|---|
| `npm run test:e2e` | Builds, then runs every browser test. |
| `npx playwright test` | Runs them all without building again, including the accessibility audit. |
| `npx playwright test e2e/gate.spec.ts` | Only one file. |
| `npx playwright test -g "photo"` | Only tests whose name contains "photo". |
| `npx playwright test --project=desktop` | Only the desktop width (or `--project=mobile`). |
| `npx playwright test --headed` | Shows the browser while it runs, to watch what it does. |
| `npx playwright test --ui` | An app to pick tests, run them, and step through each action. |
| `npx playwright test --reporter=html` then `npx playwright show-report` | A clickable report with screenshots of failures. |

**What happens when you run them:**
1. `e2e/global-setup.ts` brings the **test database** (`E2E_DATABASE_URL` in `.env`) up to date, resets it to the demo data, and creates a test gate and a test monitor (`e2e/create-test-devices.ts`).
2. Playwright starts the built app on **port 3100** (`playwright.config.ts`, `webServer`), with the clock pinned to the demo morning.
3. Both widths run at the same time on the same database. That's why each test uses a different student per width.

**Files:**

| File | What's in it |
|---|---|
| `playwright.config.ts` | Port, the two widths, the test database, the pinned clock. |
| `e2e/global-setup.ts`, `e2e/database.ts` | Resetting the test database before each run. |
| `e2e/create-test-devices.ts` | The test gate and monitor, and their tokens. |
| `e2e/sessions.ts` | `signInAs(...)`: how a test becomes the principal, a teacher or a parent. |
| `e2e/test-data.ts` | Test tokens, `readerDigitsFor` (a card as the USB reader types it), `activeCardSerialFor`. |
| `e2e/*.spec.ts` | The tests: `students`, `gate`, `gate-monitor`, `attendance`, `station`, `parent`, `login`, `theme`, `a11y`. |
| `e2e/fixtures/` | Files the tests upload (`photo.png`). |
| `test-results/` | **After a failure:** one folder per failed test, with `error-context.md` (what the page looked like) and a screenshot. |

---

## 5. The database (Docker and Postgres)

Your database runs in a Docker container called `talaan-postgres`. The data itself lives in a Docker volume, `talaan-pgdata`, so it survives restarts.

| Command | What it does |
|---|---|
| `docker ps` | Lists running containers. `talaan-postgres` should say `Up`. |
| `docker ps -a` | Also lists stopped ones. `Exited` means it's stopped: start it. |
| `docker start talaan-postgres` | Starts it. |
| `docker stop talaan-postgres` | Stops it. The data is kept. |
| `docker logs talaan-postgres --tail 30` | Its last messages, when it won't start. |
| `docker exec -it talaan-postgres psql -U postgres -d talaan` | Opens a SQL prompt on your database (`\dt` lists tables, `\q` quits). Use `-d talaan_test` for the test database. |
| `npx prisma studio` | Opens a web page to browse and edit the tables. |

Useful SQL inside `psql` (table and column names with capitals need double quotes):
```sql
select "firstName", "lastName", "photoKey" from "Student" where "photoKey" is not null;
select * from "Tap" order by "tappedAt" desc limit 10;
select label, kind, status, "lastSeenAt" from "Device";
```

**After the Mac sleeps,** the container sometimes stops (`Exited (255)`). Just `docker start talaan-postgres` again.

**Files:** `.env` (`DATABASE_URL`, `E2E_DATABASE_URL`), `src/lib/db.ts` (the app's connection), `docs/backend/step-30-local-postgres-docker.md` (how the container was made).

---

## 6. Database changes (Prisma migrations)

The tables are described in `prisma/schema.prisma`. Each change to it becomes a **migration**, a folder in `prisma/migrations/` with the SQL that makes the change.

| Command | When to use it |
|---|---|
| `npx prisma migrate deploy` | **Every day, and after pulling new code.** Applies migrations that are already written. Never deletes anything, never asks. |
| `npx prisma migrate status` | Shows whether your database has every migration. |
| `npx prisma migrate dev --name <what_changed>` | **Only when `schema.prisma` was changed** and a new migration needs writing. Usually done while a step is built. **If it ever asks to reset the database, answer N**: a reset deletes every row. |
| `npx prisma generate` | Rebuilds the Prisma Client (the code the app uses to talk to the database). It runs on its own after `npm install`. Run it by hand if TypeScript says a database field doesn't exist. |
| `npx prisma db seed` | Adds the demo data **without** emptying first. On a real server this is used once; on your laptop use `npm run db:reset`. |

**Files:** `prisma/schema.prisma`, `prisma/migrations/`, `prisma.config.ts`, `prisma/seed.ts`. The full explanation, including safely renaming and deleting: `docs/DATABASE-MIGRATIONS.md`.

---

## 7. The gate, the monitor and the USB reader

| Command | What it does |
|---|---|
| `npm run device:create -- --school school-balanga --kind gate --label "Main gate tablet"` | Makes a gate device and prints its token **once**. Copy it. |
| `npm run device:create -- --school school-balanga --kind monitor --label "Guardhouse TV"` | Makes a guardhouse monitor and prints its key once. |
| `npm run tap:record -- --token <gate token>` | Taps from the terminal: click the terminal, tap stickers on the reader, and each result prints as a line. |

| Address | What it is |
|---|---|
| `http://localhost:3000/gate?token=<gate token>` | The gate screen. The token is saved on the device, then disappears from the address bar. |
| `http://localhost:3000/gate/display/connect?key=<monitor key>` | Connects a TV as the guardhouse monitor (once), then shows `/gate/display`. |
| `http://localhost:3000/gate/display` | The monitor, also open to a signed-in principal. |

**The reader beeps but nothing happens:**
1. Click on the gate page itself. The reader types into whichever window has the keyboard. The page shows an orange bar when it doesn't have it.
2. Click into any text box and tap. If no digits appear there either, unplug the reader and plug it back in (it happens after the Mac sleeps).
3. After `npm run db:reset`, the old token no longer works: make a new gate.

**Files:**
- `src/features/gate/gate-kiosk.tsx` (the gate screen);
- `src/features/gate/scan-buffer.ts` (key presses into card scans);
- `src/features/gate/gate-client.ts` (what the tablet stores, and its calls);
- `src/services/taps/record-tap.ts` (what the server decides);
- `src/features/students/card-serial.ts` (10 digits into hex);
- `scripts/create-device.ts`, `scripts/record-tap.ts`.

More in `docs/GATE.md`.

---

## 8. Git: saving your work

| Command | What it does |
|---|---|
| `git status` | What changed since the last commit. |
| `git diff` | The exact lines that changed. `q` quits. |
| `git add -A` | Stages every change (new, changed and deleted files) for the next commit. |
| `git commit -m "fix(gate): …"` | Saves the staged changes as one commit, with a message. |
| `git push` | Sends your commits to GitHub, where CI runs the checks. |
| `git log --oneline -10` | The last 10 commits. |

The usual order: the checks (section 2), then `git add -A`, then `git commit -m "…"`, then `git push`. Commit messages follow `type(area): what changed`, for example `feat(students): …`, `fix(gate): …` or `docs(plan): …`.

---

## 9. When something is stuck

| Symptom | Try |
|---|---|
| `Can't reach database server at localhost:5432` | `docker start talaan-postgres` (section 5). If Docker itself isn't running, open Docker Desktop first. |
| The page spins ("Rendering…") forever, or acts on old code | Stop `npm run dev` with `Ctrl+C` and start it again. |
| `Port 3000 is already in use` | An old server is still running: `lsof -ti tcp:3000 \| xargs kill`, then `npm run dev`. |
| The gate says "That token doesn't work" | The database was reset, or the device was revoked: make a new gate (section 7). |
| Build or tests act strangely after many changes | `rm -rf .next`, then build again. |
| Everything is strange after changing packages | `rm -rf node_modules .next && npm ci`: a clean install, like CI does. |
| A browser test failed | Read `test-results/<test name>/error-context.md`, or rerun that one test with `--headed` (section 4). |
| Every staff page shows "SESSION_SECRET is missing or shorter than 32 characters" | Add `SESSION_SECRET` to `.env` (section 1), then restart `npm run dev`. |
| Signed out after a restart, or on every page | The `SESSION_SECRET` in `.env` changed, or the cookie is more than 30 days old. Sign in again. |
| `prisma migrate dev` asks to reset | Answer **N**, and send the message. Nothing is lost while you haven't answered yes. |
