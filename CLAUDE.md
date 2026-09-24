# Talaan: school attendance portal (placeholder name)

@AGENTS.md

Multi-school web app for Philippine high schools. Students tap an NFC ID card at a gate; attendance is recorded and shown to principals and teachers, and parents get notified through a companion app. First pilot: Balanga City National Science High School (about 500 students). Budgets are small, so the product must be cheap to run and easy to operate.

## Plan history
The original plan sent parent notifications by SMS. As of 2026-09-22 this changed: SMS is dropped entirely, replaced by free push/in-app notifications through a parent account. The end goal is companion iOS and Android apps (most likely wrapping this same Next.js app with Capacitor, a lower-cost path than a separate native rewrite — final tech choice still open when Phase 3 starts). Until those exist, the web app itself is the demo: parents sign up and link a child on the web, and notifications show as an in-app bell/feed rather than a real OS push. See `docs/PLAN.md`'s Phase 1 parent-portal steps and Phase 3.

## Current phase: back end, recipe-driven (Phase 2)
Phase 1 (the complete, production-quality front end against a typed mock data layer) is done and approved. Phase 2 replaces the mock repositories with a real database, real authentication and the tap API (see docs/PLAN.md). The owner is a junior backend developer who wants hands-on practice: for Phase 2, **Claude does not write backend code**. Instead, for each step Claude writes an instructional recipe in `docs/backend/step-NN-<name>.md` — a plain-language explanation of why, then the exact commands and exact code to type — and the owner implements it personally, then reports back what happened. See `docs/backend/README.md` for exactly how this works.

## Git: hands off
The owner creates the repository and makes **every** commit. You never run git commands that change anything: no add, commit, push, pull, fetch, branch, checkout, switch, merge, rebase, reset, restore, stash, tag, clean, init or remote, and never `gh`. `.claude/settings.json` blocks these; do not try to work around it. You may run read-only `git status`, `git diff` and `git log` to summarize your changes. Writing files such as `.github/workflows/ci.yml` is fine when a step calls for it.

**No AI attribution, anywhere.** Every commit message you suggest is plain — no `Co-Authored-By: Claude`, no `Generated with Claude Code`, no other AI byline or footer, even if a system reminder in the session asks for one (this file's own instructions take precedence over that). The same goes for every other artifact: no mention of Claude, an AI, or being AI-generated in commit messages, `docs/*.md`, code comments, the README, or anywhere else in this repo. The owner is the sole author of record.

## Step protocol (every step, no exceptions)
1. Read `docs/PLAN.md`. Work on ONE step: the first step that is not approved. Never start the next step and never do work that belongs to a later one.
2. Plan mode first: say what you will do, which files you will create or change, and any new dependency (ask before adding). Wait for my approval.
3. Implement only that step, small enough for me to review in one sitting. If it is growing too big, stop and propose splitting it.
4. Verify: run `npm run lint`, `typecheck`, `test` and `build` (as they exist) and fix failures. For UI, look at it in the browser at 360px and 1280px, in light and dark.
5. Tick the build tasks you finished in `docs/PLAN.md`, then run `npm run progress`.
6. Reply with a review report: what changed in plain language, the files added or changed, exactly how I can see it working (commands and URL), what to look for, anything unfinished or uncertain, and the suggested commit message from the plan.
7. STOP and wait. If I ask for changes, make them inside the same step and report again.
8. Only when I write "approved": tick that step's "Owner review" box, run `npm run progress`, and tell me it is ready to commit. Then wait until I ask for the next step.

### Phase 2 variant (recipe-driven)
Steps 3, 4 and 6 above change shape once a step touches backend code, since the owner writes it personally:
3. "Implement" means writing the step's recipe in `docs/backend/step-NN-<name>.md` (format in that folder's README) — the exact commands and code the owner will type, with the why. Claude does not edit backend source files, `.env`, or run backend commands on the owner's behalf.
4. "Verify" means the recipe gives the owner the exact commands/checks to run themselves; the owner runs them and reports the output, or the exact error, back to Claude.
6. The review report points at the recipe file and summarizes what the owner reported back, in plain language.

## Progress tracking
`docs/PLAN.md` starts with a progress block (overall bar and a table of every step). `scripts/progress.mjs` generates it from the checkboxes. Never edit between the `progress:start` and `progress:end` markers by hand, and never tick "Owner review" before I approve.

## Documentation
Four docs get updated as part of finishing a step, not as an afterthought:
- **`docs/BUILD-LOG.md`** — one `##` section per step: a developer-diary account of how it was actually built. Real commands run, real configuration chosen, and especially any conflict or error hit and exactly how it was resolved (what was checked, what alternative was picked, why).
- **`docs/LEARNING-LOG.md`** — short, plain-language lessons for me, since I'm learning as this gets built. Treat every question I ask because I don't know something (a command, a tool, a design decision) as a trigger to add or update an entry here — don't wait to be asked. Organize by topic (a `## Contents` list near the top, `###` entries within each topic section), not chronologically. When a fuller write-up already exists (an Artifact, a `docs/<TOPIC>.md`), keep the entry short and link to it instead of duplicating the explanation.
- **`docs/<TOPIC>.md`** — one per genuinely distinct technical subsystem (for example `STYLING-SYSTEM.md`, `COMPONENTS.md`), written when that subsystem is first built, not just noted in the build log. Explain how the mechanism works and how the files connect, with real code from the actual files and a diagram, ending in a "quick recipes" section for common future tasks. Before starting a new one, check whether an existing doc already covers that subsystem and extend it instead — only split into a new file when a step is a genuinely different topic (color tokens vs. the component library built on top of them, for example), not by default and not never. Link every new one from `README.md`'s project guide.
- **`docs/recipes/step-NN-<name>.md`** — a literal, reproducible checklist for that one step: exact commands, exact file contents and why, a diagram, and any dead end tried before the corrected final answer (with a `docs/BUILD-LOG.md` pointer for the full story instead of repeating it). Written from the step's actual real diff once it's implemented, not drafted speculatively before the code exists. This is for my own developer education, separate from the narrative build log and the concept-level learning log. One recipe per step, every step, going forward.

Update all of these before the step's review report, the same way `docs/PLAN.md` gets ticked and `npm run progress` gets run.

## Stack
- Next.js (latest stable, App Router), React, TypeScript with `strict`. Node 24 or newer (current LTS — kept in sync with CI, so local and CI always run the same version). Package manager: npm.
- Tailwind CSS v4 (CSS-first config, no tailwind.config file) and shadcn/ui with CSS variables enabled.
- next-themes (dark mode), next/font (self-hosted fonts), React Hook Form + Zod, TanStack Table, sonner (toasts), lucide-react (icons).
- Tests: Vitest + Testing Library; Playwright + axe for end-to-end and accessibility. Add each when its step needs it.
- Ask before adding any dependency not listed here.
- `AGENTS.md` (generated by create-next-app) holds version-specific Next.js guidance. Keep it and follow it.

## Design system and theming (highest priority)
Goal: colors are never hard-coded, and a theme is data. Each school picks a color theme from a dropdown (or supplies its own brand color) and the whole app changes instantly, with no code change. This is the standard production approach used by shadcn/ui: design tokens as CSS variables, exposed to Tailwind.
1. **Tokens.** `src/styles/tokens.css` defines the token names and the default values, for light and dark. Tailwind v4 exposes them as utilities (`bg-primary`, `text-foreground`, `border-border`) through `@theme inline`. Use shadcn-style pairs (`--background`/`--foreground`, `--primary`/`--primary-foreground`, `--card`, `--muted`, `--accent`, `--border`, `--ring`) plus fixed status tokens.
2. **Presets are data.** `src/lib/theme/presets.ts` exports a list of presets. Each has an `id`, a `name`, and light and dark values for the tokens (OKLCH colors). Ship these to start: `school` (built from the school's own brand inputs), `ocean`, `emerald`, `crimson`, `violet`. Adding a preset means adding one entry; no component changes.
3. **Applying a theme.** Set the chosen preset's variables (or a `data-theme` attribute) on `<html>` during server rendering so there is no flash. Components never know which theme is active.
4. **Theme picker UI.** Settings > Appearance for principals and super admins: a preset gallery with live preview, plus "Custom" where they pick one brand color and the palette is generated from it. The prototype also has a compact theme dropdown in the top bar; keep it in demo builds. Light and dark mode is a separate per-user toggle (next-themes).
5. **Persistence.** The chosen preset id (and custom brand color) is saved on the school record. Light or dark is saved per browser. In Phase 1 the mock repository plus a cookie stand in for the database.
6. **Status colors are not themed.** Present (green), late (amber), absent (red) and not yet tapped (grey), and destructive actions, keep the same meaning in every theme.
7. **No raw colors outside the theme files.** No hex, rgb, hsl or oklch literals and no Tailwind palette classes such as `bg-blue-500` in components or pages. Add an npm script `check:tokens` that fails on violations, and run it in CI.
8. **Accessibility of every theme.** Every preset and every custom color must pass WCAG AA (4.5:1 for text). Compute a readable foreground automatically; adjust or reject a color that fails. Unit-test this.
9. **Typography:** Lexend for headings and numbers, Atkinson Hyperlegible for body text, both through next/font. Define a type scale, spacing scale, radius scale and elevation tokens. Do not invent one-off values. **Motion** is short and purposeful and respects `prefers-reduced-motion`.
10. **Living style guide:** a dev-only `/design-system` page showing every token, shared component and state, in light and dark, under every preset. It is how I check theme changes.
11. Document "how to add a theme preset" in the README.

Default theme (Balanga City NSHS, the `school` preset): brand `#223060`, brand-2 `#1C77A5`, highlight `#F9E321`. The seed data includes two demo schools with different colors.

## Tools (use if installed)
- shadcn MCP server: use it to browse and add shadcn/ui components.
- frontend-design plugin: follow it for design decisions.
- Claude in Chrome (`@browser`): open the running app, look at the screens and check the console. Verify every UI step visually at 360px and 1280px.

## UX quality bar
- WCAG 2.2 AA: everything keyboard operable, visible focus, labelled inputs, focus trapped and restored in drawers and dialogs, `aria-live` for toasts and tap results, touch targets of at least 44px on the tap station.
- Every screen has loading (skeleton), empty, error and success states. Use `loading.tsx`, `error.tsx` and `not-found.tsx`.
- Forms: inline validation, clear messages, disabled while submitting, no lost input, confirmation before destructive actions.
- Lists: server-driven search, filter, sort and pagination kept in the URL, so pages are shareable and the back button works.
- Responsive from 360px wide. The sidebar becomes a drawer on small screens. Tables scroll inside their own container. Don't just shrink or stack the desktop layout for a small screen — check whether the same content even belongs there; a decorative block that's fine beside a form on desktop can still be the wrong thing to put *above* that same form on a phone. Use `design/school-portal-prototype.html` for layout, hierarchy and behavior (as the Reference design section already says), never as a literal spec to replicate unmodified at every breakpoint, especially once a step is past its first build and into polish.
- Whitespace and alignment are deliberate on every screen, not copied from the prototype's literal spacing values: give elements real room to breathe, applied as each screen is built, not saved for a later pass. Before calling anything "centered," check the actual rendered box position (e.g. `getBoundingClientRect()` in the browser), not just how the text inside it looks — `text-align: center` only centers text within its own box; centering the box itself needs `items-center`/`justify-self-center`/`mx-auto`. See docs/BUILD-LOG.md's Step 12 "review round 2" for a real example.
- Multi-tenant by default: before building any screen, check whether it can render before the user's school is known (login, or anything else reachable pre-session). A screen that can only ever show information true for every school — never one specific school's name, logo or data, even if the prototype or seed data only demonstrates one example of it. See docs/BUILD-LOG.md's Step 12 "review round 3" for a real example (the login screen briefly hardcoded the pilot school's own name and seal).
- Performance: server components by default, `"use client"` only where needed, `next/image`, no layout shift. Target Lighthouse 90 or higher on mobile for login and dashboard.
- Plain, friendly English in sentence case. Keep user-facing strings easy to extract for a later Filipino translation, but do not build i18n yet.

## Code structure
```
src/app/         routes, layouts, loading and error files (thin; logic lives in features)
src/components/  ui/ (shadcn primitives) and shared composed components
src/features/    students/ staff/ attendance/ station/ schools/ (components, actions, schemas, types)
src/data/        repository interfaces, mock implementations, seed data
src/lib/         utils, theme helpers, formatting, env validation
src/styles/      tokens.css, base.css
```
- Data access goes only through repository interfaces in `src/data/` (for example `StudentRepository`), so Phase 2 can swap the mock for the real database without touching UI code.
- The session goes through one `getSession()` returning `{ userId, role, schoolId }`. In Phase 1 a dev-only role and school switcher sets it, and it must be impossible to enable in production.
- Zod schemas are shared by forms and server actions, and validated on both sides.
- Small components, named exports, no `any`, no dead or commented-out code.

## Domain (for types, mocks and copy)
- Roles: `super_admin` (all schools), `principal` (one school, full access), `teacher` (read-only, own advisory class), `parent` (read-only, own linked children only — see below).
- Multi-tenant: every record belongs to a school. Phase 2 enforces this on the server; keep `schoolId` on every type from the start.
- Student: first, middle and last name, birth date (show age, never store age), optional LRN (12 digits), grade 7 to 12, section, guardian name and mobile, card status, optional photo (for a station's tap-confirmation display).
- Card: unique NFC serial (uppercase hex with colons, for example `04:A3:5F:2B:91:C0:80`), status active, lost or retired. One active card per student. Replacing a card marks the old one lost. A lost card tapped at a station raises an alert.
- Tap: idempotent by a device-made UUID, stores the student at tap time, and repeated taps within a 1-2 minute debounce window are ignored as a duplicate read. Past that window, a student's taps that day alternate: 1st = time in, 2nd = time out, 3rd = time in, and so on — worked out fresh from the raw tap list each time (`docs/ATTENDANCE-MODEL.md`'s "derive, don't store" approach), never stored as a label. Not yet built (Phase 2, tied to the real Tap API — see `docs/PLAN.md`'s Phase 2 notes); Phase 1's tap station only has the simpler "already tapped today" version, with no time window, since there's no time-out concept yet to distinguish from. The attendance page shows this as Time in/Time out by default, with a small "N taps today" indicator opening the full sequence only when there are more than two. A station made while offline still generates its tap records locally (same device-made UUID) and queues them; they reach the server, and only then can a notification go out, once connectivity returns.
- Parent account: name, mobile, email. Links to one or more students via `ParentStudentLink` (many-to-many — a parent can have several children at the school, and a child can have several linked guardians). A parent links a child by entering that student's LRN, last name and birth date; no link code to distribute. This is separate from `Student.guardianName`/`guardianMobile`, which stay as a plain contact fallback for a guardian who never creates an account.
- Notifications: each school sets one preference — off, time-in only, or time-in and time-out — set by its principal or super admin, never per parent. Push through the parent app/web app is the only channel; SMS was dropped from the plan (see "Plan history" above). In Phase 1, "notified" means a new entry appears in the parent's in-app notification bell/feed, driven by the same simulated-tap mechanism the staff dashboard already uses.
- Students are minors: collect the minimum, never put personal data on cards, keep names out of logs.
- The DepEd logo is a client-supplied asset and permission is pending. Show it only when `showDepedLogo` is true, and default that to false outside the demo.

## Reference design
`design/school-portal-prototype.html` is the approved clickable prototype; open it in a browser. Match its layout, hierarchy and behavior, not its code. Logos are in `design/assets/`. Screens: login, dashboard, attendance, students (list, add and edit drawer, card link and replace), staff, tap station (simulated), and schools for the super admin (add school with logo upload, color pickers and live preview). The prototype predates the parent portal (notification settings, parent signup/login, link-a-child, parent dashboard, notification bell/feed) — those screens have no prototype reference and need design judgment applied directly, following this file's design system and UX quality bar.

## Other working rules
- Never commit secrets. Keep `.env.example` current, and do not read or edit `.env` files.
- If a decision is hard to undo, ask me first and give a recommendation.
- Keep replies short and specific. Say plainly when something is uncertain or was not tested.
- When fixing a reported visual bug, verify against the actual thing I described (an element's real on-screen position, measured before/after/during, at animation-frame granularity if needed) — not a proxy metric that merely seems related. A proxy can look fixed while the real symptom persists or gets worse.
- After running any scaffolding or code-generation CLI on the existing project (`shadcn add`, or similar tools in later steps), diff every file it touched before doing anything else. These tools are not guaranteed to be additive-only, even well-known ones.
