# Talaan

A school attendance portal for Philippine high schools. Students tap an NFC ID card at a gate; attendance is recorded and shown to principals and teachers.

This is currently **Phase 1: front end only**. The app runs against a typed mock data layer — there is no real database or authentication yet. See [`docs/PLAN.md`](docs/PLAN.md) for the full build plan and progress, and [`design/school-portal-prototype.html`](design/school-portal-prototype.html) for the approved reference design.

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

| Script              | What it does                                                                    |
| ------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`       | Start the app locally, with hot reload.                                         |
| `npm run build`     | Build the app for production.                                                   |
| `npm run start`     | Run the production build (run `build` first).                                   |
| `npm run lint`      | Check the code with ESLint.                                                     |
| `npm run format`    | Reformat all files with Prettier.                                               |
| `npm run typecheck` | Check TypeScript types without emitting output.                                 |
| `npm run test`      | Run the test suite once with Vitest.                                            |
| `npm run test:e2e`  | Build the app, then run end-to-end tests (user journeys: login, add student, replace card, tap station, theme, parent flow) in a real browser with Playwright. |
| `npm run test:a11y` | Build the app, then run the accessibility audit (axe on every screen, plus keyboard and focus checks) in a real browser with Playwright. |
| `npm run check:tokens` | Fail if a raw color (hex/rgb/hsl/oklch or a Tailwind palette class) shows up outside the theme files. |
| `npm run progress`  | Regenerate the progress table at the top of `docs/PLAN.md` from its checkboxes. |

## Theming

Every color a school sees comes from a **theme preset** — never a hardcoded value in a component. Presets live in [`src/lib/theme/presets.ts`](src/lib/theme/presets.ts); `src/lib/theme/contrast.ts` checks every one of them against WCAG AA automatically (see [`docs/STYLING-SYSTEM.md`](docs/STYLING-SYSTEM.md) for how the whole mechanism fits together).

**To add a new preset:**

1. In `src/lib/theme/presets.ts`, add an entry to `themePresets` with a new `id` and `name`, and light/dark values for every color in `ThemeColorTokens`. Use the `oklchToken(lightness, chroma, hue)` helper (see the existing presets for examples) — it keeps the color inside what a screen can actually display.
2. Run `npm run test`. `presets.test.ts` checks every text/background pairing in your new preset against WCAG AA in both light and dark mode, and will fail with the exact pairing and ratio if something isn't readable enough — adjust the lightness of that color and re-run until it passes.
3. That's it — no component changes needed. A preset is picked by passing its `id` to `<ThemePresetStyle presetId="..." />` (currently hardcoded to `DEFAULT_THEME_PRESET_ID` in the root layout; a real per-school picker comes in a later step).
4. Check it against every token and component at `/design-system` (dev-only — 404s in a production build) with `?preset=your-new-id`.

## Project guide

- [`docs/PLAN.md`](docs/PLAN.md) — the step-by-step build plan and progress tracker (a checklist).
- [`docs/BUILD-LOG.md`](docs/BUILD-LOG.md) — a detailed account of how each step was actually built: real commands, configuration choices, and how any problems were solved.
- [`docs/LEARNING-LOG.md`](docs/LEARNING-LOG.md) — short, plain-language notes explaining tools and commands along the way.
- [`docs/STYLING-SYSTEM.md`](docs/STYLING-SYSTEM.md) — how the design tokens, Tailwind, and dark mode actually work together, file by file, with diagrams.
- [`docs/COMPONENTS.md`](docs/COMPONENTS.md) — the shadcn/ui component library: the Radix decision, how components pick up our tokens, and the shared `StatusPill`/`EmptyState`/`PageHeader` components.
- [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) — the domain types, Zod schemas and seed data: what a School/Student/Card/Tap/Alert actually is, and how the sample data fits together.
- [`docs/DATA-ACCESS.md`](docs/DATA-ACCESS.md) — the repository pattern and the dev-only session: how data actually gets read, and where `getSession()`/`setDevSession()` fit in.
- [`docs/AUTH.md`](docs/AUTH.md) — the two independent sign-in mechanisms: staff's dev-only demo session and the parent portal's real signup/login/link-a-child, why they don't share code, and where a parent's password actually lives in Phase 1.
- [`docs/APP-SHELL.md`](docs/APP-SHELL.md) — the sidebar, top bar, mobile drawer, role-based navigation and route guards: how they connect, and how to add a new page or nav item.
- [`docs/ATTENDANCE-MODEL.md`](docs/ATTENDANCE-MODEL.md) — how a tap becomes "present"/"late"/"absent": the cutoffs, why attendance is calculated rather than stored, and how "Simulate a tap" works end to end.
- [`docs/NOTIFICATIONS.md`](docs/NOTIFICATIONS.md) — how a tap becomes a parent notification: the fan-out helper, the school preference gate, time-in/time-out derivation, and the shared-read simplification.
- [`docs/URL-DRIVEN-LISTS.md`](docs/URL-DRIVEN-LISTS.md) — how the Students list's search, filters, sort and pagination all live in the URL: the parse/build helpers, why sorting needs no client JavaScript, and how the search box's debounce works.
- [`docs/FORMS.md`](docs/FORMS.md) — how the add/edit drawer works: one Zod schema shared by client and server validation, shared drawer state, wiring a shadcn `Select` into React Hook Form, and the Server Action shape every future write form reuses.
- [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md) — the automated accessibility audit (axe + Playwright, in CI) and the shared pieces that carry accessibility for every screen: the skip link, landmarks, keyboard-scrollable tables, drawers that return focus. Ends with recipes like "audit a new screen".
- [`docs/TESTING.md`](docs/TESTING.md) — three kinds of tests and when to use each: unit tests (Vitest, fast), end-to-end tests (Playwright, user journeys), and the accessibility audit. Includes shared-data collision rules for concurrent test runs and recipes for adding new tests.
- [`docs/RESPONSIVE-LISTS.md`](docs/RESPONSIVE-LISTS.md) — how lists become cards on a phone and stay tables on a desktop, the shared ⋮ row menu with its confirm-before-remove dialog, and how drawers fit a phone screen. Also covers the page header, filters and pagination on a phone. Ends with recipes like "turn another table into cards on phones".
- [`docs/OWNER-GUIDE.md`](docs/OWNER-GUIDE.md) — how the owner works with Claude on this project, step by step.
- [`docs/recipes/`](docs/recipes/) — a literal, reproducible checklist per plan step (exact commands, file contents and why, in order), for rebuilding a step from scratch rather than just reading about it. Skips any dead ends a step originally hit — each recipe gives the corrected, final answer directly, with a pointer to `docs/BUILD-LOG.md` for anyone who wants the full story. Piloted with [Step 1](docs/recipes/step-01-scaffold.md) and [Step 2](docs/recipes/step-02-tooling.md); written alongside every step from [Step 16](docs/recipes/step-16-card-link-replace.md) onward.
- [`CLAUDE.md`](CLAUDE.md) — the standing instructions Claude follows for this project (stack, design system, code structure, workflow rules).
