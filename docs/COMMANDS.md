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
   - [Staff accounts and set-password links](#7b-staff-accounts-and-set-password-links-step-505)
   - [The live server (Heroku)](#7c-the-live-server-heroku-step-52)
   - [The parent API](#7d-the-parent-api-steps-533-and-534)
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

**Signing in (Steps 50 and 50.1):** every staff page needs a signed-in session. Type an account's email and password at `http://localhost:3000`, or, in development only, use the "Try the prototype as" buttons or the top bar's "Preview as" menu. Every active demo account's password is `Talaan123!`:

| Account | Email |
|---|---|
| Super admin | `admin@talaan.example` |
| Balanga's principal | `principal@school-balanga.talaan.example` |
| Balanga's teacher | `teacher@school-balanga.talaan.example` |
| A demo parent (at `/parent/login`) | `parent-one@balanga.example` |

The other schools follow the same pattern (`principal@school-oceanview.talaan.example`). The browser tests sign in on their own.

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

Fast tests of single functions and components, with no browser and no database. One exception: `prisma-isolation.test.ts` (Step 51) checks the real database queries against the browser tests' database, and is skipped when `E2E_DATABASE_URL` isn't in `.env`.

| Command | What it does |
|---|---|
| `npm test` | Runs every unit test once. |
| `npx vitest run src/features/gate` | Only the tests in one folder. |
| `npx vitest run src/features/gate/scan-buffer.test.ts` | Only one file. |
| `npx vitest run -t "duplicate"` | Only the tests whose name contains "duplicate". |
| `npx vitest run isolation` | The school-isolation tests (Step 51): every action tried across schools, and the real database queries. |
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
1. `e2e/global-setup.ts` brings the **test database** (`E2E_DATABASE_URL` in `.env`) up to date, resets it to the demo data, and creates a test gate, a test monitor and a second school's gate (`e2e/create-test-devices.ts`).
2. Playwright starts the built app on **port 3100** (`playwright.config.ts`, `webServer`), with the clock pinned to the demo morning.
3. Both widths run at the same time on the same database. That's why each test uses a different student per width.

**Files:**

| File | What's in it |
|---|---|
| `playwright.config.ts` | Port, the two widths, the test database, the pinned clock. |
| `e2e/global-setup.ts`, `e2e/database.ts` | Resetting the test database before each run. |
| `e2e/create-test-devices.ts` | The test gate and monitor, an Oceanview gate (Step 51), and their tokens. |
| `e2e/sessions.ts` | `signInAs(...)`: how a test becomes the principal, a teacher, a parent, or Oceanview's principal, with a signed cookie. |
| `e2e/test-data.ts` | Test tokens, `readerDigitsFor` (a card as the USB reader types it), `activeCardSerialFor`. |
| `e2e/*.spec.ts` | The tests: `students`, `gate`, `gate-monitor`, `attendance`, `station`, `parent`, `login`, `theme`, `isolation`, `a11y`. |
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
| `npx prisma migrate dev --create-only --name <what_changed>` | Writes an empty or generated migration **without applying it**, so its SQL can be written or read first. Used when the data changes but `schema.prisma` doesn't (Step 53.1's `parent_email_lowercase`). Then `npx prisma migrate dev` applies it. **Never edit a migration once it has run anywhere**, not even a comment: Prisma notices and offers a reset. |
| `heroku run --app <name> "npx prisma migrate resolve --rolled-back <migration_name>"` | Only after a migration **failed** on Heroku and its cause was fixed by hand. It tells Prisma the failed migration didn't happen, so the next deploy tries it again. Until then every deploy stops with `P3009`. Example: `docs/PROBLEMS-LOG.md`, P-014. |
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

## 7b. Staff accounts and set-password links (Step 50.5)

| Command | What it does |
|---|---|
| `npm run staff:link -- --email teacher@school-balanga.talaan.example` | Prints a link's path for that account: their first password if they're invited, a password reset if they're active. Works once, for 7 days. |
| `npm run staff:link -- --create-super-admin --email you@example.com --first-name Pat --last-name Santos` | Creates a super admin, then prints their link. How the very first account on a new server gets in. |

It prints a path like `/set-password?token=…`. Put the site's address in front of it: `http://localhost:3000/set-password?token=…` locally. On Heroku (Step 52) the same command runs as `heroku run --app bantayaral "npm run staff:link -- …"` (quotes included, see 7c), and the address is the Heroku one.

In the app, a principal gets the same links without the terminal: the dialog after **Invite staff**, or Staff → ⋮ → **Copy sign-in link** / **Copy password reset link**. A super admin gets a new school's principal's link right after **Add school**.

**Files:** `scripts/staff-link.ts`, `src/services/auth/set-password-link.ts`, `src/app/set-password/page.tsx`. Needs `SESSION_SECRET` in `.env`, the same one the app uses, or the app won't accept the link.

---

## 7c. The live server (Heroku, Step 52)

**What "deploy" means now:** you push to `main`, CI runs, and only when CI passes does Heroku build and release the new version by itself. There's no separate `git push heroku`. Every command here names the app with `--app bantayaral` (the app's Heroku name).

| Command | What it does |
|---|---|
| `heroku logs --tail --app bantayaral` | The live server's log as it happens: builds, the release phase, start-up, errors. `Ctrl+C` stops watching. |
| `heroku ps --app bantayaral` | The running dynos. There should be exactly one `web`, `up`. |
| `heroku releases --app bantayaral` | Every deploy, numbered (`v12`, `v13`, …). |
| `heroku rollback v<N> --app bantayaral` | Puts an older version's code back. Doesn't touch the database. |
| `heroku config --app bantayaral` | The server's settings. Shows values, so don't run it while sharing your screen. |
| `heroku config:set NAME=value --app bantayaral` | Changes a setting; the server restarts by itself. |
| `heroku run npx prisma db seed --app bantayaral` | Loads the demo data. First deploy only. |
| `heroku run --app bantayaral "npm run staff:link -- --email <email>"` | A sign-in or reset link, as in 7b. Add `--create-super-admin --first-name … --last-name …` inside the quotes for the first account. |
| `heroku run --app bantayaral "npm run device:create -- --school school-balanga --kind gate --label 'Main gate tablet'"` | A gate (or `--kind monitor`) token, as in section 7. |
| `heroku pg:psql --app bantayaral` | A `psql` prompt on the live database. `\q` quits. |
| `heroku pg:backups:capture --app bantayaral` | A backup right now. `heroku pg:backups --app bantayaral` lists them. |
| `curl https://bantayaral.herokuapp.com/api/v1/health` | `{"ok":true,"database":"ok"}` when the site and its database are fine. |
| `dig www.bantayaral.com CNAME +short` | Where a domain name points. Prints the DNS target once a new record is live; prints nothing while it's still spreading. |

**`heroku run` with an `npm run … -- …` script:** put `--app bantayaral` right after `heroku run`, then the whole script in double quotes, with single quotes inside for a label that has spaces. Without the quotes, the Heroku CLI mangles the command and the server answers `/bin/bash: line 1: run: command not found` (P-011 in `docs/PROBLEMS-LOG.md`).

**Files:** `Procfile`, `package.json` (`engines`), `src/instrumentation.ts`, `src/lib/env.ts`, `src/app/api/v1/health/route.ts`. Full guide: `docs/DEPLOY.md`.

---

## 7d. The parent API (Steps 53.3 and 53.4)

What the Expo app calls. The full contract, with every answer, is `docs/PARENT-API.md`. With `npm run dev` running, sign in as a demo parent:

```bash
curl -s -X POST http://localhost:3000/api/v1/parents/login -H 'Content-Type: application/json' \
  -d '{"email":"parent-one@balanga.example","password":"Talaan123!","deviceLabel":"curl"}'
```

The answer has a `token` starting with `tal_par_`. Put it in a variable, then:

| Command | What it shows |
|---|---|
| `curl -s http://localhost:3000/api/v1/parents/me -H "Authorization: Bearer $TOKEN"` | the parent and each child's day so far |
| `curl -s "http://localhost:3000/api/v1/parents/children/student-0001/taps?date=2026-06-19" -H "Authorization: Bearer $TOKEN"` | one child's taps that day, labelled in and out |
| `curl -s http://localhost:3000/api/v1/parents/schools` | the schools to pick from when linking a child (no token needed) |
| `curl -s "http://localhost:3000/api/v1/parents/notifications?limit=2" -H "Authorization: Bearer $TOKEN"` | the newest 2 notifications, the unread count (stops at 10), and `nextBefore` |
| `curl -s "http://localhost:3000/api/v1/parents/notifications?limit=2&before=$NEXT" -H "Authorization: Bearer $TOKEN"` | the next, older 2: put the last answer's `nextBefore` in `NEXT` |
| `curl -s -X POST http://localhost:3000/api/v1/parents/notifications/read-all -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}\n"` | `204`; every one of the parent's notifications is read (one: `…/notifications/<id>/read`) |
| `curl -s -X POST http://localhost:3000/api/v1/parents/push-tokens -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"token":"ExponentPushToken[test]","platform":"android"}' -o /dev/null -w "%{http_code}\n"` | `204`; the phone's push address is saved |
| `curl -s -X POST http://localhost:3000/api/v1/parents/logout -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}\n"` | `204`; the phone's push address is removed and the token stops working |

After registering a push token, open **Attendance** as a principal and press **Record time in** on that parent's child's row (Step 55): the dev server's terminal shows `push: 1 message(s) to the log sender, none sent` and `push: sent 1, …` (Step 54, `docs/PUSH.md`). Restart `npm run dev` after pulling Step 54, so the push worker starts. About 15 to 20 minutes after a push, a quiet 5-minute check logs `push: receipts ok 1, …` and deletes that push's row (Step 54.1).

Five wrong passwords for one email answer `429` for 15 minutes. Locally, requests come from this computer's own address, which the per-network limits never count. The tests send `X-Forwarded-For: 203.0.113.x` to try them.

**Starting the parent app's repository** (`mobile/README.md`), with it cloned next to this folder as `bantayaral-parent-app`:

| Command | What it does |
|---|---|
| `cp -R mobile/starter/. ../bantayaral-parent-app/` | Copies the starter kit (its `CLAUDE.md`, plan, docs, logo, `.claude` settings and `.env.example`) into the app's repository. The `/.` includes the hidden files. |
| `cp docs/PARENT-API.md ../bantayaral-parent-app/docs/TALAAN-API.md` | Copies the API contract. Run it again whenever `docs/PARENT-API.md` changes. |
| `ipconfig getifaddr en0` | This Mac's address on the Wi-Fi, only when the app should use Talaan on this Mac instead of Heroku: its `EXPO_PUBLIC_API_URL` becomes `http://<address>:3000`. |
| `heroku config:set PUSH_SENDER=expo EXPO_ACCESS_TOKEN=<token> --app bantayaral` | At the app's M7: the live server sends real pushes instead of only logging them. Type the token yourself. |

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
| "Too many tries. Wait 15 minutes and try again." | 5 wrong passwords for that email in 15 minutes. Wait, or restart `npm run dev` (the count is kept in the server's memory). |
| Signed out after a restart, or on every page | The `SESSION_SECRET` in `.env` changed, or the cookie is more than 30 days old. Sign in again. |
| `prisma migrate dev` asks to reset | Answer **N**, and send the message. Nothing is lost while you haven't answered yes. |
| `heroku pg:psql …` says "The local psql command could not be located" | This Mac has no `psql`, but the Docker database does. Run the same query through it: `docker exec -it talaan-postgres psql "$(heroku config:get DATABASE_URL --app bantayaral)" -c '<the SQL>'` (start it first with `docker start talaan-postgres`). Or install `psql` for good: `brew install libpq && brew link --force libpq`. |
