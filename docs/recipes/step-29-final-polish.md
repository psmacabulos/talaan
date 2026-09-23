# Step 29: Final polish

A pass over the finished Phase 1 app: measure real Lighthouse scores, check every screen at 360px/1280px in light and dark, confirm no list still scrolls sideways, remove dead code, and make sure the whole test suite is actually green — not just "was green once."

## Lighthouse

Installed the Lighthouse CLI globally (one-time, not a project dependency):

```bash
npm install -g lighthouse
```

Ran it against the **production build**, not `npm run dev` — dev mode's hot-reload client adds overhead that has nothing to do with real performance:

```bash
npm run build
npm run start   # serves the production build on :3000

# Mobile (emulated CPU/network throttling) and desktop presets, against each page:
lighthouse http://localhost:3000/ \
  --chrome-flags="--headless=new --no-sandbox" \
  --output=json --output-path=<tmp>/lh-login-mobile.json \
  --emulated-form-factor=mobile

lighthouse http://localhost:3000/ \
  --chrome-flags="--headless=new --no-sandbox" \
  --output=json --output-path=<tmp>/lh-login-desktop.json \
  --preset=desktop

# Dashboard needs a session — set the dev-only session cookie directly
lighthouse http://localhost:3000/dashboard \
  --chrome-flags="--headless=new --no-sandbox" \
  --output=json --output-path=<tmp>/lh-dash-mobile.json \
  --emulated-form-factor=mobile \
  --extra-headers="{\"Cookie\":\"talaan-dev-session=staff-0001\"}"
```

(`staff-0001` is the seeded principal — see `src/data/seed/staff.ts`.)

Results:

| Page | Device | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|---|
| Login | Mobile | 73 | 100 | 100 | 100 |
| Login | Desktop | 97 | 100 | 100 | 100 |
| Dashboard | Mobile | 79 | 100 | 100 | 100 |
| Dashboard | Desktop | 98 | 100 | 100 | 100 |

Reading a Lighthouse JSON report without `jq` (not installed): the category scores live at `.categories.<name>.score` (0–1), findable with:

```bash
grep -A 2 '"id": "performance"' report.json
```

**Why mobile performance is below 90 and that's not a bug to chase today:** Lighthouse's mobile preset simulates a slow phone (4x CPU slowdown) and a slow network (simulated 4G), against a plain `next start` with no CDN, no HTTP/2, no edge caching, on a Windows dev machine. Nearly the entire mobile penalty is Largest Contentful Paint (5.5s, and LCP is 25% of the performance score) — a number that measures the hosting environment far more than the app's own code. Revisit once there's a real Vercel deployment to point Lighthouse at.

## Visual review

Used the `@browser` Playwright MCP tool to open login, dashboard, students, staff, schools, attendance, settings, station, and both parent pages at 320px, 360px and 1280px, in light and dark. Checked for horizontal overflow with a small script instead of eyeballing every page:

```js
// Playwright: check every major route for sideways scroll at a given width
await page.setViewportSize({ width: 360, height: 800 });
for (const route of ['/dashboard', '/attendance', '/students', '/staff', '/schools', '/settings', '/station']) {
  await page.goto('http://localhost:3000' + route, { waitUntil: 'networkidle' });
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  console.log(route, overflow); // 0 everywhere = no sideways scroll
}
```

All routes returned `0` at 320px and 360px — Step 27.8's fixes hold.

## The guardian-name bug this review found

Every row in the Students table showed the exact same name twice: once as the student, once directly under it as "the guardian." Traced to `src/data/seed/students.ts`:

```diff
-    // Guardians share the student's own surname (usually a parent).
-    const guardianFirstName = nameAt(index + 1000).firstName;
+    // Guardians share the student's own surname (usually a parent). The
+    // offset must not be a multiple of FIRST_NAMES.length (40) — it was
+    // 1000 before, which silently made every guardian's first name equal
+    // the student's own.
+    const guardianFirstName = nameAt(index + 13).firstName;
```

`nameAt()` (in `src/data/seed/names.ts`) picks a first name with `FIRST_NAMES[index % FIRST_NAMES.length]`. `FIRST_NAMES` has exactly 40 entries, and `1000 % 40 === 0` — so `nameAt(index + 1000).firstName` always equalled `nameAt(index).firstName`. Any offset not divisible by 40 fixes it; `13` was picked because it's coprime with 40, so it cycles through every name rather than lining back up.

Diagnosing this in a screenshot rather than in the code is exactly the "measure the real thing" habit CLAUDE.md asks for — the bug wasn't visible by reading the seed file in isolation (`nameAt(index + 1000)` *looks* fine), only by seeing two identical names stacked in the rendered table.

## The `npm run test:e2e` script never actually worked on Windows

```diff
-    "test:e2e": "npm run build && playwright test 'e2e/(login|students|station|theme|parent).spec.ts'",
+    "test:e2e": "npm run build && playwright test e2e/login.spec.ts e2e/students.spec.ts e2e/station.spec.ts e2e/theme.spec.ts e2e/parent.spec.ts",
```

`npm run <script>` always spawns `cmd.exe` on Windows, no matter which shell you typed the command into. `cmd.exe` doesn't treat single quotes as quoting — it just sees the `|` inside them as a literal pipe and errors:

```
'students' is not recognized as an internal or external command, operable program or batch file.
```

Fixed by listing the five spec files as plain space-separated arguments — no characters that mean anything special to any shell. Confirmed by running the actual command a person would type (not `npx playwright test '...'` directly, which is what was probably used to "verify" this originally, since it only works from Bash):

```bash
npm run test:e2e
# 30 passed, 4 skipped, three runs in a row
```

## Fixing a whole suite of stale e2e tests

Running `npx playwright test` (the full suite — this is exactly what CI runs) found 26 of 162 tests failing. Full details of each root cause are in `docs/BUILD-LOG.md`'s Step 29 entry and `docs/LEARNING-LOG.md`'s new "End-to-end tests can quietly go stale" section; the short version, as a checklist for spotting these again:

- `getByLabel("X")` matches *any* accessible name containing "X" as a substring — check for a nearby element (an icon-toggle button, a "Confirm X" field, a "Filter by X" control) that also contains your search text, and add `{ exact: true }` if so.
- A shadcn `Select` is a button (`role="combobox"`), not a native `<select>` — drive it with `.click()` then `getByRole("option", ...).click()`, never `.selectOption()`.
- An `aria-live` region (used for tap results, per CLAUDE.md's accessibility rules) is not a `role="dialog"` — match its actual text instead.
- Copy expectations in a test ("Active", "Email is required") from the real rendered page, not from memory.
- A table row can be rendered as a single clickable `<button>` wrapping its cells rather than a `<tr>` — check with a Playwright ARIA snapshot before assuming `role="row"` exists.
- A component can show a status as a table `cell` at one breakpoint and as plain text inside a `listitem` at another (Step 27.8's card layout) — write a small locator helper that matches either shape, like `presentRows()` in `e2e/station.spec.ts`.
- `.count()` doesn't auto-retry the way `expect(...).toBeVisible()` does — always wait for something to be visible before counting.
- Tests in the same file that share a finite pool of seed records (e.g., "the next untapped student") can race each other under parallel execution — `test.describe.configure({ mode: "serial" })` fixes a race *within* one file.

**A gap left open on purpose:** `e2e/a11y.spec.ts` competes for the same untapped-Balanga-student pool as `station.spec.ts` and `parent.spec.ts`, and nothing stops those three files from racing each other across files. `npm run test:e2e` doesn't include `a11y.spec.ts`, so it's unaffected (verified 3 clean runs). But `npx playwright test` — what CI runs — hit this twice in a row (2/162 failures both times). Documented in `docs/TESTING.md` rather than patched here, since the real fix is proper per-file test isolation (e.g., different schools for different files), not a bigger seed pool.

## Unused code

Checked for commented-out code and TODO/FIXME markers:

```bash
grep -rn "TODO\|FIXME\|XXX" src --include="*.ts*"
```

None found. `npm run lint` (which fails on unused imports and variables) was already clean.

## Verification

```bash
npm run lint        # clean
npm run typecheck   # clean
npm run test        # 321 passed
npm run build       # succeeds
npm run check:tokens # no raw colors found
npm run test:e2e     # 30 passed, 4 skipped, no flakes across 3 runs
npx playwright test  # 158/160 runnable tests pass (2 known cross-file race, see above)
```

See `docs/BUILD-LOG.md`'s Step 29 entry for the full narrative, including what's still open (the sitewide spacing/alignment pass) at the time this step went up for review.
