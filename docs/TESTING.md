# Testing: three kinds

Talaan has three testing approaches, each with its own purpose. They run independently and cover different needs.

## Unit tests: logic in isolation

**Files:** `src/**/*.test.ts` and `src/**/*.test.tsx`  
**Command:** `npm run test`  
**Tools:** Vitest + React Testing Library  
**Speed:** ~1 second total (104 tests)

Tests for pure functions, repository behavior, and React components in isolation. Unit tests run fast and are good for catching bugs in individual pieces of code. They do NOT test whether the whole page works together or whether the real database connection succeeds — that's what the other two are for.

Each test receives a mock repository with zero simulated latency, so tests aren't slowed by the 150ms "realistic network" delay the app uses.

**When to add a unit test:**
- A schema needs validation testing (e.g. `attendance-search-params.test.ts` confirms URL params are parsed correctly).
- A pure function needs coverage (e.g. `status.test.ts` tests the attendance logic).
- A component's user-facing behavior needs checking in isolation (e.g. a button's click handler).

## End-to-end tests: full user journeys

**Files:** `e2e/login.spec.ts`, `e2e/students.spec.ts`, `e2e/theme.spec.ts`, `e2e/parent.spec.ts`, `e2e/attendance.spec.ts`, the gate's and the parent API's (the full list is `npm run test:e2e` in `package.json`)  
**Command:** `npm run test:e2e`  
**Tools:** Playwright (Chrome, mobile and desktop viewports)  
**Speed:** ~30–60 seconds

Opens the real app in Chrome and does what a person would do: click a button, fill a form, reload the page, check the result. These tests exercise real page routing, real session cookies, the real mock data layer, and the real UI as it renders in a browser.

Runs twice per test: once at 360px (mobile) and once at 1280px (desktop).

**Tested journeys:**
1. **Login:** form validation, sign-in flow (Phase 1 shows "not ready yet"), parent login redirects
2. **Add student:** create a new student and search for them in the list
3. **Replace card:** link a card, mark it lost, tap a new one
4. **Record a time in by hand** (Step 55): press the button on an untapped student's row, confirm, and the time and "Recorded by staff" appear (the `/station` journey before it was removed in Step 55.1)
5. **Theme switching:** pick a preset from the dropdown, reload, verify it persists; "Saved theme" restores school colors
6. **Parent flow** (phone only): the principal records Carmen Sison's time in, a new parent signs up and links her, sees the notification in the bell and on the notifications page, signs out and back in

### Shared sample data

All tests run against one instance of the running app. The app resets its sample data when the server starts, but within a single run, all tests read and write to the same data store. To avoid collisions:

- Any test that creates records (add student, signup parent) uses unique names, emails and LRNs, generated with a test-run ID (from `test-data.ts`).
- Tests never edit records that other tests read (e.g., don't change the seeded staff).
- The parent flow runs only at phone width to avoid multiple tests trying to link the same student at the same time.
- A test that taps or records a student uses one no other test touches, by name, and a different one per project (phone and desktop share the database). Students with no card are the safest: only the real gate and "Record time in" can tap anyone, and the gate tests use carded students.

**Until Step 55.1** the `/station` kiosk's "Valid card" tapped whichever Balanga student was next, so several spec files competed for one pool of untapped students, and `parent.spec.ts` had to read back whoever got tapped. With the station gone, every test names its own student (`parent.spec.ts`: Carmen Sison; `attendance.spec.ts`: Teresa Lazaro and Manuel Flores; `a11y.spec.ts`: Katrina Aguilar, dialog only). The spare batch in `students.ts` stays, as untapped students for tests like these.

**A gotcha if you ever extend the spare batch further:** the seed's name generator (`nameAt` in `names.ts`) repeats every 40 students, and Balanga's own 36-student roster already uses every residue below 36 — so a naive spare student can silently duplicate an existing student's exact name (found the hard way: a spare student became a second "Juan Cruz", breaking `students.spec.ts`'s search-by-name test). Only residues 36-39 are safe within Balanga; see `studentAt()`'s `nameIndex` parameter in `students.ts`.

### When to add an end-to-end test

- A new user-facing feature that involves multiple pages or multiple steps (e.g., "sign up, link a child, see a notification").
- A critical flow that must not break (e.g., login, attendance recording).
- Anything that involves forms, navigation, or persistence across a page reload.

Do NOT use end-to-end tests for:
- Checking that a single component renders correctly — that's a unit test.
- Testing every possible error state — unit tests with mocks are faster.
- Editing shared seed data (schools, staff) — the tests will interfere with each other.

## Accessibility audit: everyone can use it

**Files:** `e2e/a11y.spec.ts`  
**Command:** `npm run test:a11y`  
**Tools:** Playwright + axe (WCAG 2.2 AA)  
**Speed:** ~60–90 seconds

Opens every screen in the app (logged in as each role, light and dark modes, under every theme preset) and runs axe's accessibility checker on what's on screen. Also checks keyboard behavior (skip link, focus trap in drawers) and touch target sizes.

**What it catches:**
- Missing or wrong ARIA labels
- Low contrast text
- Missing form error associations
- Non-keyboard-operable controls
- Inaccessible color alone (status conveyed by color needs also conveyed by text or icon)

**What it does NOT catch:**
- Typos or clarity of instructions (axe only checks technical accessibility)
- Whether the content makes sense to a person using a screen reader

### Quick recipes

**Add a new screen to the audit:**
1. Add it to the `SCREENS` list in `a11y.spec.ts`.
2. Run `npm run test:a11y` and fix any violations.

**Audit a modal, drawer or menu:**
These open on a click/keyboard press, so axe only sees what's on screen. The a11y spec already has a "interactive states" section that opens common ones (drawers, modals, menus) first, then audits. If you add a new interactive component, add a test here.

**Test a new interaction (focus trap, etc.):**
The "keyboard and focus" section (bottom of a11y.spec.ts) has tests for focus behavior. Add yours there so it's checked on every CI run.

## In CI

The GitHub Actions workflow runs all three:
```
npm run test                     # unit tests
npm run lint                     # linting
npm run typecheck                # TypeScript
npm run build                    # build the app
npx playwright test              # e2e + a11y (both runs together)
```

`npx playwright test` runs on a single worker in CI specifically (`workers: 1` when `process.env.CI` is set, in `playwright.config.ts`) — every test shares one running server and its one in-memory mock data store, so CI trades some speed for a deterministic run order instead of files/projects racing each other for shared seed data. Locally, the same command still runs in parallel.

All must pass before a commit can be merged. If a browser test fails in CI but passes locally, that usually means:
- The test relies on timing (e.g., "wait 100ms") — add a proper wait condition instead.
- The test is flaky (sometimes passes, sometimes fails) — add more explicit assertions or wait conditions.
- The test hits shared seed data that another test mutated — add isolation or use unique test data.

## How they fit together

```
┌─────────────────────────────────────────────────────────┐
│ Unit tests check: does this one function work right?    │
│ (fast, focused, many of them)                           │
└─────────────────────────────────────────────────────────┘

         ↓ if units work, does the app?

┌─────────────────────────────────────────────────────────┐
│ End-to-end tests check: can the user do this task?      │
│ (slower, but cover the real journeys)                   │
└─────────────────────────────────────────────────────────┘

         ↓ if the app works, can everyone use it?

┌─────────────────────────────────────────────────────────┐
│ Accessibility audit checks: is it usable by everyone?   │
│ (automated, checks all screens, every role & theme)     │
└─────────────────────────────────────────────────────────┘
```

A unit test catches a typo in a function. An e2e test catches a missing form validation. An a11y test catches a missing alt text. Use all three.
