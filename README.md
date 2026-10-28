# Talaan (Bantay Aral)

The code behind **Bantay Aral** (`bantayaral.com`), a school attendance portal for Philippine high schools. "Talaan" is the code name; everything users see says Bantay Aral (`src/lib/product.ts`). Students tap an NFC ID card at a gate; attendance is recorded and shown to principals and teachers.

Phase 1 (the complete front end, against a typed mock data layer) is done. **Phase 2 (the real back end) is now in progress**, built recipe by recipe with the owner typing every line to learn backend development — see [`docs/backend/README.md`](docs/backend/README.md). See [`docs/PLAN.md`](docs/PLAN.md) for the full build plan and progress, and [`design/school-portal-prototype.html`](design/school-portal-prototype.html) for the approved reference design.

## Requirements

- Node.js 24 or newer
- npm

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

There are no environment variables required yet in Phase 1 — see [`.env.example`](.env.example).

## npm scripts

| Script                 | What it does                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Start the app locally, with hot reload.                                                                                                                        |
| `npm run build`        | Build the app for production.                                                                                                                                  |
| `npm run start`        | Run the production build (run `build` first).                                                                                                                  |
| `npm run lint`         | Check the code with ESLint.                                                                                                                                    |
| `npm run format`       | Reformat all files with Prettier.                                                                                                                              |
| `npm run typecheck`    | Check TypeScript types without emitting output.                                                                                                                |
| `npm run test`         | Run the test suite once with Vitest.                                                                                                                           |
| `npm run test:e2e`     | Build the app, then run end-to-end tests (user journeys: login, add student, replace card, record a time in, the gate, theme, parent flow) in a real browser with Playwright. |
| `npm run test:a11y`    | Build the app, then run the accessibility audit (axe on every screen, plus keyboard and focus checks) in a real browser with Playwright.                       |
| `npm run check:tokens` | Fail if a raw color (hex/rgb/hsl/oklch or a Tailwind palette class) shows up outside the theme files.                                                          |
| `npm run progress`     | Regenerate the progress table at the top of `docs/PLAN.md` from its checkboxes.                                                                                |

The full list, grouped by task, with the database, gate and git commands too: [`docs/COMMANDS.md`](docs/COMMANDS.md).

## Parent notifications: the rules

Owner decisions of 2026-10-16 and 2026-10-19. The full design is in [`docs/PUSH.md`](docs/PUSH.md), and a plain explanation with the numbers is the "Bantay Aral Push Flow" page (https://claude.ai/artifact/PgnXN3SSqE8DMRTudHWqAa).

1. **The tap's time is what matters.** It's saved in the database the moment the card is read, before any push exists. The attendance pages and the parent's feed never depend on a push.
2. **A push may arrive a few minutes late, but never silently disappears.** The notification is saved with the tap, and a worker sends it to every linked parent's phone through Expo (free), trying again with a growing wait for up to 6 hours. It says the saved time ("Juan tapped in at 7:56 AM", the first name only), however late it arrives.
3. **Background checks run every 5 minutes, not every few seconds.** A new tap is pushed straight away. Retries, receipts and cleanup wait for the 5-minute check, and receipts and cleanup run only when nothing is waiting to be sent.
4. **We keep no record of a successful push.** About 15 minutes after a push, Expo's receipt says how it went. If it was delivered, its row is deleted. Receipts are read only to stop pushing to phones whose app is gone, and to send again what Expo was too busy to send.
5. **Failed pushes are kept 7 days**, for looking into a problem, then deleted.
6. **A parent's sign-in lasts 30 days from its last use, and opening the app counts as use.** A parent who opens the app at least once a month never signs in again and keeps getting pushes. After 30 days without opening it, the sign-in is cleared and pushes stop, until the parent signs in again.
7. **It costs nothing extra.** The worker runs inside the web server, and Expo's push service is free. `PUSH_SENDER=log` keeps pushes in the log only (development, the tests, and the live server until the parent app can receive them); `expo` sends them, with `EXPO_ACCESS_TOKEN` ([`docs/DEPLOY.md`](docs/DEPLOY.md)).

## Theming

Every color a school sees comes from a **theme preset** — never a hardcoded value in a component. Presets live in [`src/lib/theme/presets.ts`](src/lib/theme/presets.ts); `src/lib/theme/contrast.ts` checks every one of them against WCAG AA automatically (see [`docs/STYLING-SYSTEM.md`](docs/STYLING-SYSTEM.md) for how the whole mechanism fits together).

**To add a new preset:**

1. In `src/lib/theme/presets.ts`, add an entry to `themePresets` with a new `id` and `name`, and light/dark values for every color in `ThemeColorTokens`. Use the `oklchToken(lightness, chroma, hue)` helper (see the existing presets for examples) — it keeps the color inside what a screen can actually display.
2. Run `npm run test`. `presets.test.ts` checks every text/background pairing in your new preset against WCAG AA in both light and dark mode, and will fail with the exact pairing and ratio if something isn't readable enough — adjust the lightness of that color and re-run until it passes.
3. That's it — no component changes needed. A preset is picked by passing its `id` to `<ThemePresetStyle presetId="..." />` (currently hardcoded to `DEFAULT_THEME_PRESET_ID` in the root layout; a real per-school picker comes in a later step).
4. Check it against every token and component at `/design-system` (dev-only — 404s in a production build) with `?preset=your-new-id`.

## Project guide

- [`docs/COMMANDS.md`](docs/COMMANDS.md) — **every command in one place**, grouped by task (starting the day, the checks before a commit, unit and browser tests, Docker and the database, migrations, the gate and the reader, git, and what to try when something is stuck), with the files behind each one.
- [`docs/PLAN.md`](docs/PLAN.md) — the step-by-step build plan and progress tracker (a checklist).
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the Phase 2 backend design: one Next.js app serving admin web, the gate station and the guardhouse monitor now, and (Phase 3) a separate parent app — database tables, the `/api/v1` endpoints, the auth approach and the folder structure.
- [`docs/ARCHITECTURE-REVIEW.md`](docs/ARCHITECTURE-REVIEW.md) — a current-state architecture review grounded in the implemented routes, services, repositories, database, authentication and deployment model, including present scaling constraints.
- [`docs/BUILD-LOG.md`](docs/BUILD-LOG.md) — a detailed account of how each step was actually built: real commands, configuration choices, and how any problems were solved.
- [`docs/LEARNING-LOG.md`](docs/LEARNING-LOG.md) — short, plain-language notes explaining tools and commands along the way.
- [`docs/PROBLEMS-LOG.md`](docs/PROBLEMS-LOG.md) — every problem hit while building and running the app, numbered and dated: what was seen, the cause, the fix, and whether it's resolved, with diagrams where several systems are involved.
- [`docs/STYLING-SYSTEM.md`](docs/STYLING-SYSTEM.md) — how the design tokens, Tailwind, and dark mode actually work together, file by file, with diagrams.
- [`docs/COMPONENTS.md`](docs/COMPONENTS.md) — the shadcn/ui component library: the Radix decision, how components pick up our tokens, and the shared `StatusPill`/`EmptyState`/`PageHeader` components.
- [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) — the domain types, Zod schemas and seed data: what a School/Student/Card/Tap/Alert actually is, and how the sample data fits together.
- [`docs/DATA-ACCESS.md`](docs/DATA-ACCESS.md) — the repository pattern and the dev-only session: how data actually gets read, and where `getSession()`/`setDevSession()` fit in.
- [`docs/AUTH.md`](docs/AUTH.md) — how sign-in works: the signed staff session cookie (Step 50), what it carries and how every page and action checks it, the parent portal's session, and quick recipes for new pages and actions.
- [`docs/SCHOOL-ISOLATION.md`](docs/SCHOOL-ISOLATION.md) — how one school never sees another's data: the school always comes from who is asking, every lookup by id takes the school, an audit of every way into the data, the tests that prove it, and why Postgres row-level security waits.
- [`docs/APP-SHELL.md`](docs/APP-SHELL.md) — the sidebar, top bar, mobile drawer, role-based navigation and route guards: how they connect, and how to add a new page or nav item.
- [`docs/ATTENDANCE-MODEL.md`](docs/ATTENDANCE-MODEL.md) — how a tap becomes "present"/"late"/"absent": the cutoffs, why attendance is calculated rather than stored, and how a time in recorded by hand (Step 55) works end to end.
- [`docs/NOTIFICATIONS.md`](docs/NOTIFICATIONS.md) — how a tap becomes a parent notification: the fan-out helper, the school preference gate, time-in/time-out derivation, and the shared-read simplification.
- [`docs/URL-DRIVEN-LISTS.md`](docs/URL-DRIVEN-LISTS.md) — how the Students list's search, filters, sort and pagination all live in the URL: the parse/build helpers, why sorting needs no client JavaScript, and how the search box's debounce works.
- [`docs/FORMS.md`](docs/FORMS.md) — how the add/edit drawer works: one Zod schema shared by client and server validation, shared drawer state, wiring a shadcn `Select` into React Hook Form, and the Server Action shape every future write form reuses.
- [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md) — the automated accessibility audit (axe + Playwright, in CI) and the shared pieces that carry accessibility for every screen: the skip link, landmarks, keyboard-scrollable tables, drawers that return focus. Ends with recipes like "audit a new screen".
- [`docs/TESTING.md`](docs/TESTING.md) — three kinds of tests and when to use each: unit tests (Vitest, fast), end-to-end tests (Playwright, user journeys), and the accessibility audit. Includes shared-data collision rules for concurrent test runs and recipes for adding new tests.
- [`docs/RESPONSIVE-LISTS.md`](docs/RESPONSIVE-LISTS.md) — how lists become cards on a phone and stay tables on a desktop, the shared ⋮ row menu with its confirm-before-remove dialog, and how drawers fit a phone screen. Also covers the page header, filters and pagination on a phone. Ends with recipes like "turn another table into cards on phones".
- [`docs/GATE.md`](docs/GATE.md) — how a card on the gate's USB reader becomes a stored tap: the reader's 10-digit serial, card matching by the first 4 bytes, the 2-minute debounce, resend safety, and the one-transaction write of tap, alert or notification. Ends with recipes like "try the gate without the tablet".
- [`docs/GATE-HARDWARE.md`](docs/GATE-HARDWARE.md) — which kind of gate for which school: the `/gate` page on a tablet or phone (the plan), a native gate app, a reader wired to the guardhouse PC, a Raspberry Pi reader box, or an ESP32 board. What each needs, costs and gives the student, how a box with no screen starts and fixes itself, backups for when there's no internet, and the decisions still open. A discussion document, started 2026-10-14.
- [`docs/DATABASE-MIGRATIONS.md`](docs/DATABASE-MIGRATIONS.md) — schema vs. migrations vs. the database, `migrate dev` vs. `migrate deploy`, and what happens when the database has to change after schools are using it: adding, renaming and safely deleting, with worked examples on the `School` model.
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — the live server on Heroku: what happens between a push and the site changing (CI, build, the release phase's migrations, the start-up settings check), every config var and what it's for, why there's exactly one dyno, what it costs, and quick recipes for logs, rollback, backups, gate tokens and sign-in links.
- [`docs/SCALING.md`](docs/SCALING.md) — growing from one school to many: a review of the whole app before the first deploy (2026-10-13). What's already right, what to fix before real students and parents use it, what gets slower with more schools and more years, and when to move past one server. Each item points at its step in the plan (Steps 53–64), with recipes like "spot an N+1" and "see whether Postgres uses an index".
- [`docs/PUSH.md`](docs/PUSH.md) — how a tap becomes a push on a parent's phone: the notification as the outbox, one delivery per phone, the worker inside the web server, retries, which phones get one, what the lock screen shows, and the `PUSH_SENDER` settings.
- [`docs/ERROR-TRACKING.md`](docs/ERROR-TRACKING.md) — how the owner hears something broke (Step 59): error reports through Sentry with every personal-data category off and a last scrub, Sentry's code loaded after the page so it never slows it, the uptime check on `/api/v1/health`, a deploy refused when a setting is missing, and the one error page with "Report this problem" plus Heroku's "down for a moment" page (Step 59.1).
- [`docs/EMAIL.md`](docs/EMAIL.md) — how the app sends email (Step 55.5): the `EmailSender` interface and its `log` and `smtp` senders, Resend and its DNS records, the daily limit, "Forgot your password?" for staff, and why links in emails use `APP_URL`.
- [`docs/PARENT-PORTAL.md`](docs/PARENT-PORTAL.md) — the parent pages on the web: how sign-in, "My children", a child's day, notifications and linking a child connect, what each reads, how a parent's own child's photo is allowed, and quick recipes.
- [`docs/PARENT-API.md`](docs/PARENT-API.md) — the parent app's contract: every `/api/v1/parents/*` address with a `curl` example and a real answer, the token and push-token rules, paging, photos, the error codes, and what the app never receives. Copied into the app's repository as `docs/TALAAN-API.md`.
- [`docs/PARENT-APP-REQUESTS.md`](docs/PARENT-APP-REQUESTS.md) — what the parent app asked this server for, and what was decided: each request, the decision and why, the step that builds it, what it costs, and the questions still open. Includes the today-only notification list and what an attendance history tab still needs.
- [`mobile/README.md`](mobile/README.md) — the Expo parent app's starter kit: whether the API is ready, and `mobile/starter/`, copied as it is into the app's own repository (its `CLAUDE.md` with the working rules, its plan M1–M8, the product and design rules, running against Talaan on the Mac, the logo as vector data). Replaces `docs/PARENT-APP-BRIEF.md`, which now only points there.
- [`docs/OWNER-GUIDE.md`](docs/OWNER-GUIDE.md) — how the owner works with Claude on this project, step by step.
- [`docs/recipes/`](docs/recipes/) — a literal, reproducible checklist per Phase 1 plan step (exact commands, file contents and why, in order), for rebuilding a step from scratch rather than just reading about it. Skips any dead ends a step originally hit — each recipe gives the corrected, final answer directly, with a pointer to `docs/BUILD-LOG.md` for anyone who wants the full story. Piloted with [Step 1](docs/recipes/step-01-scaffold.md) and [Step 2](docs/recipes/step-02-tooling.md); written alongside every step from [Step 16](docs/recipes/step-16-card-link-replace.md) onward.
- [`docs/backend/`](docs/backend/README.md) — Phase 2's recipes: step-by-step, owner-typed instructions for the real database, auth and API, each with the exact commands/code to type and the why. Starts at [Step 30](docs/backend/step-30-local-postgres-docker.md).
- [`CLAUDE.md`](CLAUDE.md) — the standing instructions Claude follows for this project (stack, design system, code structure, workflow rules).
