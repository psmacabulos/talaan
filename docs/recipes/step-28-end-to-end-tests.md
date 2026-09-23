# Step 28: End-to-end tests

End-to-end tests drive a real browser (Chrome via Playwright) through user journeys: login, add a student, replace a card, tap at the station, switch themes, parent sign-up and notifications.

## What changed

### New files

**Test files** (`e2e/`):
- `test-data.ts` — generates unique test data (names, emails, LRNs) so concurrent tests don't collide
- `login.spec.ts` — staff and parent sign-in, form validation, demo shortcuts
- `students.spec.ts` — add a student, replace a card with lost/new workflow
- `station.spec.ts` — valid/duplicate/lost/unknown card taps, offline queue sync
- `theme.spec.ts` — theme dropdown (principal/super admin only), persistence after reload, Saved theme
- `parent.spec.ts` — parent signs up, links a child, sees notification in bell and page, signs out/in

**Documentation**:
- `docs/TESTING.md` — how the three kinds of tests (unit, e2e, a11y) fit together, when to use each, recipes for adding tests
- `docs/recipes/step-28-end-to-end-tests.md` — this file

### Updated files

**`package.json`**:
```diff
-    "test:a11y": "npm run build && playwright test",
+    "test:e2e": "npm run build && playwright test 'e2e/(login|students|station|theme|parent).spec.ts'",
+    "test:a11y": "npm run build && playwright test e2e/a11y.spec.ts",
```

Now `test:e2e` runs only the user-journey tests, and `test:a11y` runs only the accessibility audit. `npm run build && playwright test` (which CI uses) runs both.

**`.github/workflows/ci.yml`**:
```diff
-      # Runs axe on every screen against the build above (Step 27).
-      - name: Accessibility audit
+      # Runs end-to-end tests and accessibility audit (axe on every screen).
+      - name: Browser tests (end-to-end and accessibility)
```

Comment and step name updated to reflect both kinds of browser tests now run.

## Running the tests

### Locally

```bash
# Run all unit tests (fast, ~1 second)
npm run test

# Run all end-to-end tests only (slower, ~30–60 seconds)
npm run test:e2e

# Run accessibility audit only (~60–90 seconds)
npm run test:a11y

# Run all tests (unit + e2e + a11y, in CI this is the only one that matters)
npm run test && npm run build && npx playwright test
```

### In CI

The GitHub Actions workflow runs:
```bash
npm run test             # unit tests
npm run lint             # linting
npm run typecheck        # TypeScript
npm run build            # build production app
npx playwright test      # runs ALL browser tests (e2e + a11y)
```

## How tests avoid collisions

All e2e tests run against one instance of the app with shared in-memory sample data.

- **Unique names/emails/LRNs**: Tests that create records (add student, parent signup) use a test-run ID (generated from `Date.now()`) to namespace their data. See `e2e/test-data.ts`.
- **Seed data only**: Tests read and verify seed data (existing students, staff) but never edit it.
- **Phone-only for parent flow**: The parent test runs only at 360px to avoid two tests trying to link the same student simultaneously.

If a test needs to be rerun immediately, the app's sample data is still in memory from the last run. Restart `npm run build && npx playwright start` to reset.

## Design decisions

**Staff sign-in tested as Phase 1**: Rather than launching a second dev-mode server to test "sign in as Principal," the test checks that valid submission shows "Sign-in isn't connected yet" and stays on login. This verifies:
- The form validates correctly.
- The production guard (`NODE_ENV === "production"`) is in place and working.

Real account testing arrives with Phase 2's database and real authentication.

**Playwright runs against the production build**: `npm run build` is run before `npx playwright test`, so tests exercise the real optimized code and Next.js server rendering, not development mode.

**No isolated test databases or seeds**: Tests use the app's real in-memory seed data, loaded once when the server starts. This keeps the app simple (no setup fixtures) and the tests realistic (they exercise the real data layer), but requires the collision-avoidance rules above.

**Offline queue test uses simulated offline**: The tap station has buttons to simulate offline and go back online, so the test doesn't need network interception or mocking.

## Coverage

Not covered by these tests:
- Editing a school's saved theme in Settings > Appearance (changes shared seed data, tests would collide)
- Every possible form validation error (that's what unit tests do)
- Every error state (tap API failures, database errors — those arrive in Phase 2)

## Playwright configuration

`playwright.config.ts` runs tests on two viewports:
- **Mobile:** 360px wide (Step 27.6's small-screen layout)
- **Desktop:** 1280px wide (Step 27.5's large-screen layout)

Both viewports test the same flows (login, add student, etc.) so layout regressions are caught. The parent test skips desktop and runs mobile only to avoid collisions.

## What to check

When the tests pass:
- ✅ Login form validates and shows phase-2 message
- ✅ Adding a student creates and finds them
- ✅ Card replace flow (lost → new) works
- ✅ Tap station records valid taps and updates attendance
- ✅ Theme dropdown persists after reload
- ✅ Parent signup, link, see notification, sign out/in works
- ✅ Everything above works on mobile (360px) and desktop (1280px)
- ✅ Offline queue taps sync when back online
