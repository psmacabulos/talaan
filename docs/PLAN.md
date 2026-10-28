# Build plan

<!-- progress:start -->
**Overall progress: ██████████████████░░ 88%**  (328 of 371 tasks, 87 of 98 steps approved)

**Next up:** Step 59.2, A practice restore (not started)

| Step | What | Progress | Status |
|---|---|---|---|
| 1 | Scaffold the Next.js project | ██████████ 100% | Approved |
| 2 | Formatting, type-check and test tooling | ██████████ 100% | Approved |
| 3 | Continuous integration | ██████████ 100% | Approved |
| 4 | Design tokens, fonts and dark mode | ██████████ 100% | Approved |
| 5 | Theme presets and contrast helper | ██████████ 100% | Approved |
| 6 | shadcn/ui and base components | ██████████ 100% | Approved |
| 7 | Style guide page and token check | ██████████ 100% | Approved |
| 8 | Domain types, schemas and seed data | ██████████ 100% | Approved |
| 9 | Mock repositories and session | ██████████ 100% | Approved |
| 10 | App shell and navigation | ██████████ 100% | Approved |
| 11 | Dev switchers and theme dropdown | ██████████ 100% | Approved |
| 11.5 | Responsive scaling, small screen to big screen | ██████████ 100% | Approved |
| 12 | Login page | ██████████ 100% | Approved |
| 13 | Dashboard | ██████████ 100% | Approved |
| 14 | Students list | ██████████ 100% | Approved |
| 15 | Student form | ██████████ 100% | Approved |
| 16 | Card link and replace | ██████████ 100% | Approved |
| 17 | Attendance page | ██████████ 100% | Approved |
| 18 | Staff page | ██████████ 100% | Approved |
| 19 | Tap station | ██████████ 100% | Approved |
| 20 | Parent and notification domain | ██████████ 100% | Approved |
| 21 | School notification settings | ██████████ 100% | Approved |
| 22 | Parent signup, login and link a child | ██████████ 100% | Approved |
| 23 | Parent dashboard | ██████████ 100% | Approved |
| 24 | Notification feed | ██████████ 100% | Approved |
| 25 | Schools management | ██████████ 100% | Approved |
| 26 | Appearance settings | ██████████ 100% | Approved |
| 27 | Accessibility audit | ██████████ 100% | Approved |
| 27.5 | Light and dark mode toggle | ██████████ 100% | Approved |
| 27.6 | Mobile staff list and drawer | ██████████ 100% | Approved |
| 27.7 | Mobile students cards | ██████████ 100% | Approved |
| 27.8 | Mobile cards everywhere else | ██████████ 100% | Approved |
| 28 | End-to-end tests | ██████████ 100% | Approved |
| 29 | Final polish | ██████████ 100% | Approved |
| 30 | Install Docker Desktop and run a local Postgres database | ██████████ 100% | Approved |
| 31 | Install Prisma and connect it to that database | ██████████ 100% | Approved |
| 32 | First Prisma model (`School`) and first migration | ██████████ 100% | Approved |
| 33 | Generate the Prisma Client and prove it end to end | ██████████ 100% | Approved |
| 34 | Give CI its own Postgres | ██████████ 100% | Approved |
| 35 | Swap the school repository for a real Prisma-backed one | ██████████ 100% | Approved |
| 36 | Give the browser tests their own database, reset before every run | ██████████ 100% | Approved |
| 37 | Staff in Postgres | ██████████ 100% | Approved |
| 38 | Students in Postgres | ██████████ 100% | Approved |
| 39 | ID cards in Postgres | ██████████ 100% | Approved |
| 40 | Taps and alerts in Postgres | ██████████ 100% | Approved |
| 41 | Parents and parent–child links in Postgres | ██████████ 100% | Approved |
| 42 | Parent notifications in Postgres | ██████████ 100% | Approved |
| 43 | Gate devices, their tokens, and the first `/api/v1` endpoint | ██████████ 100% | Approved |
| 44 | The real clock, in Philippine time | ██████████ 100% | Approved |
| 44.5 | Each school sets its own late and absent times | ██████████ 100% | Approved |
| 44.6 | Weekends have no late or absent | ██████████ 100% | Approved |
| 44.7 | Link a real card | ██████████ 100% | Approved |
| 45 | The tap service | ██████████ 100% | Approved |
| 46 | The tap API and the gate's roster | ██████████ 100% | Approved |
| 46.5 | Student photos | ██████████ 100% | Approved |
| 47 | The `/gate` page | ██████████ 100% | Approved |
| 48 | The `/gate/display` guardhouse monitor | ██████████ 100% | Approved |
| 49 | Time in and time out on the attendance page | ██████████ 100% | Approved |
| 50 | Signed staff sessions | ██████████ 100% | Approved |
| 50.1 | The real sign-in form | ██████████ 100% | Approved |
| 50.5 | Set-password links | ██████████ 100% | Approved |
| 51 | One school can never see another's data | ██████████ 100% | Approved |
| 51.5 | The new name, Bantay Aral, on every screen | ██████████ 100% | Approved |
| 51.6 | The Bantay Aral logo, and a new sign-in page | ██████████ 100% | Approved |
| 52 | Deploy the demo to Heroku | ██████████ 100% | Approved |
| 53 | One parent account for any number of schools | ██████████ 100% | Approved |
| 53.1 | Parent sign-in services | ██████████ 100% | Approved |
| 53.2 | Paged parent data | ██████████ 100% | Approved |
| 53.3 | Parent tokens and the sign-in API | ██████████ 100% | Approved |
| 53.4 | The parent notifications API | ██████████ 100% | Approved |
| 54 | Push notifications reach the phone | ██████████ 100% | Approved |
| 54.1 | Push receipts and cleanup | ██████████ 100% | Approved |
| 55 | Record a time in by hand | ██████████ 100% | Approved |
| 55.1 | Remove the tap station, and limit child linking | ██████████ 100% | Approved |
| 55.2 | Other guardians are told of each new link | ██████████ 100% | Approved |
| 55.3 | The school sees each link | ██████████ 100% | Approved |
| 55.4 | A principal removes a wrong link | ██████████ 100% | Approved |
| 55.5 | Email, and staff reset their own password | ██████████ 100% | Approved |
| 55.6 | Parents reset a forgotten password | ██████████ 100% | Approved |
| 56 | One read, one tap | ██████████ 100% | Approved |
| 57 | Lost cards and alerts | ██████████ 100% | Approved |
| 58 | The gate keeps taps while offline | ██████████ 100% | Approved |
| 59 | Know when something breaks | ████████░░  75% | Approved |
| 59.1 | One error page, with a way to report the problem | ██████████ 100% | Approved |
| 59.2 | A practice restore | ░░░░░░░░░░   0% | Not started |
| 59.3 | The latest tap, not just the first | ██████████ 100% | Approved |
| 59.4 | Record a time out by hand | ██████████ 100% | Approved |
| 59.5 | The parent home, like the app | ██████████ 100% | Approved |
| 59.6 | Pushes without the title, and status values that never change | ░░░░░░░░░░   0% | Not started |
| 59.7 | The notification list shows today, and opening it clears the badge | ░░░░░░░░░░   0% | Not started |
| 59.8 | A parent reports a link they don't know | ░░░░░░░░░░   0% | Not started |
| 60 | Privacy for real student data | ░░░░░░░░░░   0% | Not started |
| 61 | Queries that don't grow | ░░░░░░░░░░   0% | Not started |
| 61.1 | The roster answers "nothing changed" cheaply | ░░░░░░░░░░   0% | Not started |
| 62 | Pages ask the database once | ░░░░░░░░░░   0% | Not started |
| 63 | School calendar | ░░░░░░░░░░   0% | Not started |
| 63.1 | A child's attendance history for the parent app | ░░░░░░░░░░   0% | Not started |
| 64 | School years | ░░░░░░░░░░   0% | Not started |

_Last updated 2026-10-28. Generated by scripts/progress.mjs; do not edit this block by hand._
<!-- progress:end -->

## How this plan works
- Each step is one logical, reviewable unit of work and becomes **one commit made by the owner**. Claude never runs git.
- Claude does the first step that is not approved, and only that step. Then it stops and reports. The owner checks it, asks for changes if needed, and says "approved".
- Claude ticks the build tasks when done, and ticks "Owner review" only after the owner says "approved". Then it runs `npm run progress` to refresh the block above.
- The "Commit" line under each step is the suggested commit message.

## Phase 1: front end

### Step 1: Scaffold the Next.js project
- [x] Scaffold with the current `create-next-app` defaults (npm) into a temporary folder, then move the files into the repo root. Keep OUR `CLAUDE.md` (add `@AGENTS.md` at its top), and keep `AGENTS.md`, `.claude/`, `docs/`, `design/` and `scripts/`. Never move or create a `.git` folder (the owner's repository already exists; delete any `.git` inside the temporary folder), and delete the temporary folder afterwards.
- [x] Add the npm script `"progress": "node scripts/progress.mjs"`.
- [x] Confirm `npm run dev`, `npm run lint` and `npm run build` work.
Done when: the starter page loads locally and lint and build pass.
Commit: `chore: scaffold Next.js app`
- [x] Owner review: I checked it and said "approved"

### Step 2: Formatting, type-check and test tooling
- [x] Prettier with a config and a `format` script; a `typecheck` script; Vitest and Testing Library with one sample test and a `test` script.
- [x] `.env.example` and a README covering setup and every npm script.
Done when: `npm run lint`, `typecheck`, `test` and `build` all pass.
Commit: `chore: add formatting, typecheck and test tooling`
- [x] Owner review: I checked it and said "approved"

### Step 3: Continuous integration
- [x] `.github/workflows/ci.yml` that runs lint, typecheck, test and build on every push and pull request (file only; do not touch repository settings).
Done when: the workflow file is correct. (I confirm it is green after I push.)
Commit: `ci: add GitHub Actions workflow`
- [x] Owner review: I checked it and said "approved"

### Step 4: Design tokens, fonts and dark mode
- [x] `src/styles/tokens.css` with token names and defaults (color, radius, spacing, shadow, motion, fonts) for light and dark, mapped to Tailwind with `@theme inline`.
- [x] Fonts through next/font (Lexend, Atkinson Hyperlegible) and base styles.
- [x] next-themes for light and dark following the system setting, with no flash. Replace the starter page with a small token demo.
Done when: the demo page looks right in light and dark and uses only token classes.
Commit: `feat(design): add design tokens, fonts and dark mode`
- [x] Owner review: I checked it and said "approved"

### Step 5: Theme presets and contrast helper
- [x] `src/lib/theme/presets.ts` with the presets `school`, `ocean`, `emerald`, `crimson`, `violet` (light and dark values).
- [x] A server helper that applies a preset to `<html>` with no flash, wired into the root layout.
- [x] Contrast helper (readable foreground, AA check, custom-color palette generation) with unit tests.
Done when: switching the preset in code recolors the demo page, every preset passes AA, and the tests pass.
Commit: `feat(theme): add theme presets and contrast helper`
- [x] Owner review: I checked it and said "approved"

### Step 6: shadcn/ui and base components
- [x] Initialise shadcn/ui. Add button, input, label, select, sheet, dialog, dropdown-menu, table, badge, sonner toast and skeleton.
- [x] Shared components: `StatusPill`, `EmptyState`, `PageHeader`.
Done when: components render correctly under every preset, in light and dark.
Commit: `feat(ui): add base and shared components`
- [x] Owner review: I checked it and said "approved"

### Step 7: Style guide page and token check
- [x] Dev-only `/design-system` page showing every token, component and state under every preset, in light and dark.
- [x] `check:tokens` script that fails on raw colors outside the theme files; add it to the CI workflow.
Done when: the page is unreachable in production, and `check:tokens` fails if a hex is added to a component.
Commit: `feat(design): add style guide page and token check`
- [x] Owner review: I checked it and said "approved"

### Step 8: Domain types, schemas and seed data
- [x] TypeScript types and Zod schemas for schools, users, students, cards, taps and alerts (with `schoolId` on every record).
- [x] Seed data: 3 schools, 72 students across grades 7 to 12 and 12 sections, 7 staff, sample taps.
Done when: types and schemas compile, and schema tests pass.
Commit: `feat(data): add domain types, schemas and seed data`
- [x] Owner review: I checked it and said "approved"

### Step 9: Mock repositories and session
- [x] Repository interfaces and mock implementations with simulated latency.
- [x] `getSession()` returning `{ userId, role, schoolId }` from a dev-only cookie; impossible to enable in production.
- [x] Unit tests for the repositories.
Done when: tests pass and no UI code talks to seed data directly.
Commit: `feat(data): add mock repositories and session`
- [x] Owner review: I checked it and said "approved"

### Step 10: App shell and navigation
- [x] Authenticated layout: sidebar, top bar, responsive drawer, role-based navigation, route guards.
- [x] `loading.tsx`, `error.tsx`, `not-found.tsx`.
Done when: all three roles see the right menu, a teacher cannot open Staff, and it works at 360px and 1280px.
Commit: `feat(shell): add app shell, navigation and route guards`
- [x] Owner review: I checked it and said "approved"

### Step 11: Dev switchers and theme dropdown
- [x] Dev-only role and school switcher.
- [x] Theme dropdown in the top bar (principal and super admin, demo builds), and the school's chosen theme loaded from its record.
Done when: switching school changes logo and colors with no flash, and the dropdown recolors everything live.
Commit: `feat(shell): add dev switchers and theme dropdown`
- [x] Owner review: I checked it and said "approved"

### Step 11.5: Responsive scaling, small screen to big screen
- [x] Page titles and the shell's content padding grow at `lg`/`2xl` instead of staying frozen at their 1280px size (confirmed a real desktop-monitor target, not a TV/lobby display, so body text deliberately doesn't inflate — see docs/APP-SHELL.md's Step 11.5 section).
- [x] The app shell's main content area uses the full available width/height, capped at a generous max-width past 1536px (grows generously, then stops, rather than stretching edge to edge on an ultrawide) — a shared convention every future page inherits automatically.
Done when: checked across a real range of sizes, not just 360px/1280px (added 1920px and 2560px) — the app visibly grows with the screen instead of leaving large empty space, while staying correct and readable at 360px.
Commit: `feat(design): add fluid responsive scaling from small to large screens`
- [x] Owner review: I checked it and said "approved"

### Step 12: Login page
- [x] Login page matching the prototype: left panel (DepEd logo top left when enabled, school logo top right, "Attendance portal" and the school name in the center, graph-paper background) and the sign-in form on the right, with validation and demo shortcuts.
Done when: it matches the prototype at 360px and 1280px, in light and dark.
Commit: `feat(auth): add login page`
- [x] Owner review: I checked it and said "approved"

### Step 13: Dashboard
- [x] Segmented today bar with counts, attendance by grade, needs-attention list, live tap feed, simulated tap, and the teacher variant.
Done when: the simulated tap updates the counts and the feed for principal and teacher.
Commit: `feat(dashboard): add attendance dashboard`
- [x] Owner review: I checked it and said "approved"

### Step 14: Students list
- [x] Student table with server-driven search, filters, sort and pagination kept in the URL; loading and empty states; read-only for teachers.
Done when: filters survive a page reload and the back button works.
Commit: `feat(students): add student list with search and filters`
- [x] Owner review: I checked it and said "approved"

### Step 15: Student form
- [x] Add and edit drawer with React Hook Form and Zod, inline errors, computed age, and a server action against the mock repository.
Done when: invalid input shows clear errors, valid input saves, and focus is handled correctly.
Commit: `feat(students): add student form drawer`
- [x] Owner review: I checked it and said "approved"

### Step 16: Card link and replace
- [x] Link a card with a simulated tap, reject duplicate serials, and replace a lost card (old card marked lost, new card linked).
Done when: a lost card is flagged and one active card per student is enforced.
Commit: `feat(students): add card link and replace flow`
- [x] Owner review: I checked it and said "approved"

## Plan history
The plan originally sent parent notifications by SMS. As of 2026-09-22 this changed to free push/in-app notifications through a parent account, with iOS/Android companion apps as the eventual goal (Phase 3, tech choice not yet made) and the web app carrying the parent-facing demo until those exist. Steps 20-24 below (parent domain, notification settings, parent signup/login, parent dashboard, notification feed) are new as of that change; the old Steps 20-24 shifted down to 25-29 with no content change beyond mentioning parent screens where the existing wording already says "every screen."

As of 2026-10-03 this changed again: the plan to wrap this same app in Capacitor for Phase 3 is dropped. Phase 3 (parent app) is now a separate Expo (React Native) app, talking to the same API and using Firebase Cloud Messaging for push — see Phase 3 below. This same change folds two more clients into Phase 2 itself: a `/gate` tap station (an Android tablet with a USB NFC reader in keyboard mode) and a `/gate/display` guardhouse monitor (a live feed of recent taps). See `docs/ARCHITECTURE.md` for the full design and `CLAUDE.md`'s "Backend architecture" section for the principles. (The owner's own request for this change spoke of "phase 1: backend, gate, monitor, admin" and "phase 2: parent app" in generic terms — mapped here onto this file's existing numbering, so Phase 2 below gains gate/monitor scope and Phase 3 becomes the Expo app, rather than renumbering 29 already-approved steps.)

### Step 17: Attendance page
- [x] Date, grade and section filters, class table, empty state for dates without data.
Done when: teachers are locked to their own class.
Commit: `feat(attendance): add attendance page`
- [x] Owner review: I checked it and said "approved"

### Step 18: Staff page
- [x] Staff list and invite drawer with validation (principal and super admin only).
Done when: the invite appears in the list as "Invited".
Commit: `feat(staff): add staff list and invite drawer`
- [x] Owner review: I checked it and said "approved"

### Step 19: Tap station
- [x] Kiosk screen with ready, success, duplicate, lost-card and unknown-card states, large touch targets, and an offline simulation with a queue and a sync message.
Done when: all four results and the offline queue behave as in the prototype.
Commit: `feat(station): add tap station screen`
- [x] Owner review: I checked it and said "approved"

### Step 20: Parent and notification domain
- [x] Types, Zod schemas, mock repositories and seed data for `Parent` and `ParentStudentLink` (many-to-many), plus a `Notification` record (student, kind, tap time, read/unread) that feeds the parent notification feed. Seed a few parent accounts already linked to existing seed students.
Done when: types and schemas compile, schema tests pass, and no UI code talks to the seed data directly.
Commit: `feat(data): add parent and notification domain`
- [x] Owner review: I checked it and said "approved"

### Step 21: School notification settings
- [x] Settings > Notifications page (principal and super admin only): off / time-in only / time-in and time-out, saved to the school record.
Done when: a saved preference shows for every user of that school on the next load.
Commit: `feat(schools): add notification settings`
- [x] Owner review: I checked it and said "approved"

### Step 22: Parent signup, login and link a child
- [x] Parent signup and login (separate from staff login), and a "link a child" flow verified by LRN, last name and birth date, with clear errors for no match or an already-linked child.
Done when: a new parent account can sign up, link a real seed student, and sign back in to see that link still there.
Commit: `feat(parents): add parent signup, login and child linking`
- [x] Owner review: I checked it and said "approved"

### Step 23: Parent dashboard
- [x] A parent's home screen: list of linked children, each with a read-only attendance summary and history.
Done when: a parent with two linked children sees both, and each child's attendance matches that child's real records.
Commit: `feat(parents): add parent dashboard`
- [x] Owner review: I checked it and said "approved"

### Step 24: Notification feed
- [x] In-app notification bell/feed for parents, populated by the same simulated-tap mechanism the staff dashboard uses, honoring the school's notification preference (off / time-in only / both).
Done when: simulating a tap for a linked child adds a notification for its parent(s), and the preference correctly suppresses or allows it.
Commit: `feat(parents): add notification feed`
- [x] Owner review: I checked it and said "approved"

### Step 25: Schools management
- [x] Schools list, open a school to see its theme, and add a school with logo upload.
Done when: a super admin can add a school and view it with its own logo and colors.
Commit: `feat(schools): add schools management`
- [x] Owner review: I checked it and said "approved"

### Step 26: Appearance settings
- [x] Settings > Appearance for principal and super admin: preset gallery with live preview, a "Custom" brand color with generated palette, contrast check, and saving to the school record.
Done when: a saved preset shows for every user of that school on the next load, and a failing custom color is corrected or rejected with a clear message.
Commit: `feat(theme): add appearance settings`
- [x] Owner review: I checked it and said "approved"

### Step 27: Accessibility audit
- [x] Run axe on every screen, including the parent portal, fix issues, and check keyboard use and focus handling.
Done when: no serious or critical axe violations remain.
Commit: `fix(a11y): resolve accessibility audit findings`
- [x] Owner review: I checked it and said "approved"

### Step 27.5: Light and dark mode toggle
- [x] A visible light/dark control, which the plan had missed (the only toggle lived on the dev-only `/design-system` page). A sun/moon icon button opens a small menu: Light, Dark, Match device (the default). It sits in the staff top bar at every width, in the parent portal header next to the bell, and in the top-right corner of the login, parent login and parent signup pages. The choice is saved per browser (next-themes), as CLAUDE.md specifies. It's covered by the Step 27 accessibility audit.
Done when: the control works on every screen at 360px and 1280px, the choice survives a reload, and the accessibility audit still passes.
Commit: `feat(theme): add light and dark mode toggle`
- [x] Owner review: I checked it and said "approved"

### Step 27.6: Mobile staff list and drawer
Pulled forward from Step 29's "Mobile table layout" task at the owner's request (2026-09-23): polish first, end-to-end tests after. Staff sets the pattern; Steps 27.7 (Students) and 27.8 apply it everywhere else.
- [x] Below 768px the Staff table becomes a compact list, one ~64px row per person: initials, name, and one line saying what they do ("Principal", "Teacher", or "Adviser, Grade 7 – Rizal"), an "Invited" tag only for pending invites (an active account shows nothing), and a ⋮ menu whose top line is the email. No column labels. (Review round 1: the first version, tall cards with an email line and labelled Role | Advisory class | Status columns, was too big to scroll through a long list.) From 768px up the table stays as it was, plus a ⋮ column. No sideways scrolling at 320, 375, 390 or 428px.
- [x] The ⋮ menu's first real actions: Resend invitation (pending invites only) and Remove (with an "Are you sure?" dialog; never your own account), against the mock data. One rule decides what each row offers, shared by the menu and the server actions.
- [x] Red (destructive) buttons fill solid red on hover. The shadcn default tint measured 4.12:1 (light) and 3.87:1 (dark) contrast when hovered, below AA; found by the audit in review round 1.
- [x] Invite drawer on phones: full screen width (was 75%), fields stacked one per row, the advisory-class explanation shortened behind an ⓘ toggle, and 44px Cancel/Invite buttons pinned at the bottom.
Done when: no horizontal overflow at 320–1280px in light and dark with a very long name and email, the accessibility audit passes including the new menu and dialog, and lint, typecheck, test, build and check:tokens pass.
Commit: `feat(staff): show staff as a compact list on small screens`
- [x] Owner review: I checked it and said "approved"

### Step 27.7: Mobile students cards
Planned from a sample phone mockup the owner shared (2026-09-23), taking what fits this project and leaving the rest (docs/RESPONSIVE-LISTS.md section 3 says what and why). The owner chose separate cards over Step 27.6's divided list, and no bottom navigation bar for now. Split from the original "everywhere else" step so each is reviewable in one sitting.
- [x] Below 768px the Students table becomes cards: initials, name, one line under it ("Grade 12 – Silang", or today's time in for a teacher, whose list is all one class), today's status badge on the right, and a card tag only for "No card" or "Lost". Age, LRN and guardian stay in the edit drawer. Tapping a card opens the edit drawer (principals and super admins only). Staff switches from its divided list to the same cards.
- [x] Phone toolbar: full-width search, grade and card filters side by side below it, all 44px tall. Pagination stays on one row with 44px page buttons.
- [x] Page headers keep the action button beside the title on phones ("Add", "Invite"), with the description full width underneath; from 640px up the button sits to the right as before.
- [x] Add/edit student drawer on phones: full screen width (was 75%), fields stacked one per row, 44px Cancel/Save buttons pinned at the bottom.
Done when: no horizontal overflow at 320–1280px in light and dark, the "small screens" audit test covers Students, and lint, typecheck, test, build and check:tokens pass.
Commit: `feat(students): show students as cards on small screens`
- [x] Owner review: I checked it and said "approved"

### Step 27.8: Mobile cards everywhere else
Attendance is laid out after a second sample phone screen the owner shared (2026-09-23), in this app's own styling (docs/RESPONSIVE-LISTS.md section 3 says what was taken).
- [x] Apply Step 27.7's card pattern to every other list that still scrolls sideways on a phone: Schools, the Attendance table and the dashboard class roll.
  - Schools: one card per school, with the name, "36 students · 4 staff", and a "Notifications off" tag only when they're off. Tapping a card opens the school.
  - Attendance: date full width, grade and section side by side (all 44px), the four counts as boxed tiles, a "Students · N total" heading, and cards with today's status on the right and the time in under it. There's no LRN on the card, and a "No card" or "Lost" tag only when it's the exception.
  - Class roll (teacher dashboard): the same layout as divided rows inside its panel, not boxes inside a box. On desktop too, a student without a card now gets the "No card" (or "Lost") tag instead of "No ID card linked yet" (owner review).
- [x] Apply the same drawer treatment to the Add school drawer (and any other drawer not yet done): full width on phones, fields stacked, footer buttons pinned and thumb-sized.
- [x] Borders with no color of their own (table row lines, the drawer's edge, the dialog footer line) were drawn in the text color, dark navy in light mode, instead of the light border color. Every border now defaults to the border token, the rule shadcn's own setup adds. Found while measuring this step and fixed here at the owner's request. It lightens the desktop table lines too.
Done when: the "small screens" audit test covers every list page, and lint, typecheck, test, build and check:tokens pass.
Commit: `feat(ui): show lists as cards on small screens`
- [x] Owner review: I checked it and said "approved"

### Step 28: End-to-end tests
- [x] Playwright tests for login, add student, replace card, tap station, theme switch, and the parent flow (sign up, link a child, see a notification).
Done when: the tests pass locally and are added to the CI workflow.
Commit: `test: add end-to-end tests`
- [x] Owner review: I checked it and said "approved"

### Step 29: Final polish
- [x] Lighthouse pass on login and dashboard, 360px and 1280px review in light and dark, remove unused code, finish the README.
- [x] ~~Sitewide spacing/alignment consistency pass~~ — dropped at the owner's request (2026-09-24): not worth doing now since parts of the design may still change later. Revisit once the design is more settled, rather than as a standing Phase 1 task.
- [x] Mobile table layout: moved out to Steps 27.6 (Staff, sets the pattern), 27.7 (Students) and 27.8 (every other list and drawer) at the owner's request. Here, only re-check that no list added since still scrolls sideways at 360px (Step 27.8's measuring script checked every page, every role, at 320, 360 and 375px).
Done when: scores and the review are reported honestly, and lint, typecheck, test, build and check:tokens pass.
Commit: `chore: final polish for phase 1`
- [x] Owner review: I checked it and said "approved"

## Phase 2: back end, gate station and guardhouse monitor (recipe-driven — see docs/backend/README.md)

**Fast-track from Step 36 (2026-10-09):** Claude now implements each step's code, following its recipe, so the app reaches a demo and the gate hardware sooner. The owner still runs every check, approves each step and commits, and studies the recipes afterwards. See the note at the top of `docs/backend/README.md`. The paragraph below describes how Steps 30–35 were done.

Unlike Phase 1, the owner writes every line of backend code personally, to learn backend development in Next.js. For each step, Claude writes an instructional recipe in `docs/backend/step-NN-<name>.md` (why, exact commands, exact code); the owner types it, runs it, and reports back what happened. See `docs/backend/README.md` for exactly how this works. Steps are smaller than Phase 1's — one idea at a time — so only the current step is written out in full below; the rest of Phase 2 stays a rough roadmap until we reach it.

### Roadmap (titles only, detailed one at a time)
- Step 30: Install Docker Desktop and run a local Postgres database
- Step 31: Install Prisma and connect it to that database
- Step 32: First Prisma model (`School`) and first migration
- Step 33: Generate the Prisma Client and prove it end to end (seed + query)
- Step 34: Give CI its own Postgres (moved ahead of the swap on 2026-10-05, so the swap's commit doesn't turn CI red)
- Step 35: Swap the school repository for a real Prisma-backed one, side by side with the existing interface
- Step 36: Give the browser tests their own database, reset before every run
- Step 37: Staff in Postgres (first relation)
- Step 38: Students in Postgres
- Step 39: ID cards in Postgres, with "one active card per student" enforced by the database
- Step 40: Taps and alerts in Postgres
- Step 41: Parents and parent–child links in Postgres, with hashed passwords
- Step 42: Parent notifications in Postgres
- Step 43: Gate devices, their tokens, and the first `/api/v1` endpoint (heartbeat)
- Step 44: The real clock, in Philippine time (decided 2026-10-09: real date and time by default; an optional `DEMO_NOW` setting pins the clock to the demo morning for the browser tests and screenshots; seed data stays on 20 June 2026; `Asia/Manila` for every school). Stored times become real instants, read on the school's clock in one place; pages load only the day they show
- Step 44.5: Each school sets its own late and absent times in Settings, defaulting to 8:05 and 9:00 AM (decided 2026-10-09; split out of Step 44 on 2026-10-10 to keep each step reviewable in one sitting)
- Step 44.6: Weekends have no late or absent (decided 2026-10-11: on a Saturday or Sunday the times vary, so a tap is just recorded with its time, shown as "Came in", and a student with no tap shows "No tap", never Absent; the same for every school). The seed demo day moves from Saturday 20 June to Friday 19 June 2026 so the demo morning keeps its late and absent students
- Step 44.7: Link a real card: the student drawer's Card serial field takes what the USB reader types (10 digits, then Enter) or hex typed by hand, through the same `normalizeCardSerial` the gate will use, and refuses a card that's already linked, was lost before, or shares its first 4 bytes with another active card (asked for by the owner on 2026-10-11, before the tap service, so the pilot stickers can be linked for the demo)
- Step 45: The tap service: record a real tap (card lookup, 2-minute debounce, lost-card alert, notification) in one transaction, which also sets the gate's `lastSeenAt`. Serials: accept the reader's 10 digits and 4- or 7-byte hex, matching on the first 4 bytes when there's no exact match (owner decision, 2026-10-09)
- Step 46: The tap API, `POST /api/v1/gate/taps`, plus `GET /api/v1/gate/roster`: the school's active cards with each student's name, grade, section and photo address, for the gate's own copy
- Step 46.5: Student photos: a photo upload in the student drawer, resized to a small thumbnail in the browser before upload, kept in S3-compatible storage behind a `PhotoStorage` interface (local folder in development), with only the photo's key stored on the student (decided 2026-10-10: the demo must show photos, since the photo is how the guard confirms identity)
- Step 47: The `/gate` kiosk page with the USB NFC reader (reader format answered 2026-10-09: 10 decimal digits, the first 4 UID bytes reversed, then Enter; see `docs/ARCHITECTURE.md`'s open question 1). Calls the heartbeat once, at token setup; no timer (decided 2026-10-09). **Shows the tapping student's photo on the gate screen itself (decided 2026-10-10):** phones full screen, tablets split (current result large, last few taps beside it). **A tap is never blocked or delayed by what's on screen:** every scan is sent the moment it's read, even while the previous student's photo is still showing, and the screen switches straight to the newest one. If nobody taps, the last result clears back to "Tap your card" after a few seconds. That timer only tidies the screen and never holds up a tap. Reads cards from the USB reader (keyboard mode), and on Android also from built-in NFC (Web NFC). **Keeps its own copy of the roster and photo thumbnails on the device (decided 2026-10-10):** downloaded once, refreshed by asking "anything new?" every few minutes, so the photo shows instantly from the device while the tap goes to the server, which still decides the status. Holds only what the screen shows (no LRN, birth date or guardian details) and wipes it when its token is revoked
- Step 48: The `/gate/display` guardhouse monitor (live feed over server-sent events). A TV opens a link with a monitor key built in, swapped for a cookie on first visit; a signed-in principal or super admin can watch the same feed with no registration, and teachers don't get it; the monitor sends no heartbeat (decided 2026-10-09, `docs/ARCHITECTURE.md`)
- Step 49: Time in and time out on the attendance page
- Step 50: Signed staff sessions (decided 2026-10-11: our own signed, httpOnly session cookie with the Step 41 scrypt passwords, no Auth.js; re-confirmed 2026-10-12 as option A after comparing JWT, Better Auth, Auth.js and hosted services). No cookie means signed out. Split in two on 2026-10-12 so each half is reviewable in one sitting
- Step 50.1: The real sign-in form: the password is checked, wrong tries are limited, Sign out, and the parent portal's cookie is signed too
- Step 50.5: Set-password links: the app makes a one-time link the principal sends however they like (no email service), which also creates the first super admin from the terminal
- Step 51: Every query scoped to the signed-in school, with tests proving one school can't see another's
- Step 51.5: The product's name, Bantay Aral, on every screen (decided 2026-10-13: the domain is bantayaral.com, since talaan.com wasn't available). "Talaan" stays the code name inside the code
- Step 51.6: The Bantay Aral logo, redrawn as SVG, and a new sign-in page from the owner's brand sheet (2026-10-13)
- Step 52: Deploy the demo to Heroku, with photos on Cloudflare R2 (decided 2026-10-11)
- Step 53: The parent API, `/api/v1/parents/*`, for the Expo parent app (added 2026-10-11, so the app can start the next day). Split on 2026-10-15: Step 53 moves a parent's school onto each linked child, Step 53.1 is the API
- Step 53 is followed by Steps 54–64 ("Phase 2b" below): Step 54 sends pushes to parents' phones for the demo, and Steps 55–64 are the fixes from the 2026-10-13 review of the whole app (`docs/SCALING.md`).
- After the demo: most of this list became Steps 54–64 on 2026-10-13: the notification outbox and its worker (54), the gate's offline queue (58), backups and monitoring (59), and privacy (consent, export and delete, audit log) (60). Still unnumbered: Web Push; device online/offline on the dashboard ("last seen", maybe a 5-minute idle check-in); an admin screen for devices.

Steps 41–52 are ordered demo-first (decided 2026-10-09): everything a live gate demo needs comes before what can wait. Phase 3 (the Expo parent app) follows Phase 2.

### Where we are (hand-over note, updated 2026-10-13)
Read this first in a new conversation, together with `CLAUDE.md`.

- **Built and committed:** Steps 30–49, plus the review changes listed under Steps 44.7, 46.5, 47 and 48:
  - the drawer saves the card and photo only on Save;
  - the gate reads taps after a click;
  - gate photos load after a reload;
  - photos are 4:5 portraits;
  - a refined tap card on the gate and the monitor.

  Each is explained in `docs/BUILD-LOG.md` ("Review change/fix: …", and "Notes from the home test with the real reader").
- **Approved on 2026-10-12:** Steps 46, 46.5, 47, 48 and 49, tested by the owner with the real USB reader.
- **Built and committed overnight, 2026-10-12 (owner away, authorized to build, test and commit without pushing):** Step 50.5 (`dafb62e`) and Step 51 (`fb721a7`). Step 51 also fixed a real hole: the tap station's save trusted the school in the browser's tap. **Approved on 2026-10-13**, with one review fix: "Forgot your password?" now says who to ask for a reset link (`046b072`).
- **Email:** Steps 55.5 (email, and staff reset their own password on the web) and 55.6 (parents, from the app and the web portal), sending from `bantayaral.com`. Owner decision, 2026-10-13: parents recover their own password, never by asking the school.
- **Next:** Step 51.6's review (the logo and sign-in page), then Step 52 (deploy to Heroku), then Step 53 (the parent API), then Step 54 (push to parents' phones).
- **Logo (owner request, 2026-10-13):** built in Step 51.6, before the deploy, with a new sign-in page from the owner's brand sheet. The parent app reuses the same mark (`docs/PARENT-APP-BRIEF.md`).
- **The name (2026-10-13):** the product is **Bantay Aral** (`bantayaral.com`; talaan.com wasn't available). "Talaan" stays the code name: the repository, package, database, cookies, token prefixes and code. Step 51.5 changes only what people see.
- **The demo (owner's goal, 2026-10-13):** the web app and the parent app both working: a parent registers in the app, links a child, and gets a push when the child taps at the gate. The parent app lives in its own repository, from `docs/PARENT-APP-BRIEF.md`. Its first step (M1, the setup) can start any time. The steps after it need Step 53 live. Step 54 is finished alongside the app, since its last check needs the app's push token. Steps 55–64 come after the demo. The owner wants this as fast as possible.
- **The 2026-10-13 review:** `docs/SCALING.md`, owner-requested, of the whole app. Nothing in it blocks the demo deploy. Its fixes are Steps 55–64. Step 53 gained three tasks. Two were decided on 2026-10-13: one parent account covers any number of schools, and the app registers Expo push tokens. The third: load parent data one day or one page at a time.
- **The owner's goal:** finish the web app (Steps 50–53, including 50.1), so the Expo parent app (Phase 3) can start against the parent API (Step 53).
- **Owner accounts needed for Step 52:** Heroku (with the GitHub Student credit) and Cloudflare R2. See that recipe's "Your part".
- **Working rules (2026-10-12), on top of CLAUDE.md:**
  - Stop after every change worth a commit, give the commit message, and wait for the owner to commit before touching more code. Docs-only edits may happen in between.
  - The owner runs the full checks. Claude may run the one spec file a change touches, and screenshots for UI.
  - Every new or changed command goes into `docs/COMMANDS.md` in the same change.
  - Every owner question gets a `docs/LEARNING-LOG.md` entry.
- **Known small gaps, after the demo:**
  - ~~the gate's photos don't load from the tablet's cache when the server can't be reached at start-up~~ (done in Step 58);
  - under the pinned demo clock, a duplicate's Recent entry shows the tablet's real time.

### Step 30: Install Docker Desktop and run a local Postgres database
- [x] Install Docker Desktop; confirm `docker --version` and `docker run hello-world` both work.
- [x] Run a local Postgres container for this project (`talaan-postgres`, with a named volume so data survives restarts) and confirm it's reachable — `docker ps` shows it `Up`, and a `psql` session inside the container shows an empty `talaan` database.
- [x] Add `DATABASE_URL` to `.env.example` (the shape, committed) and to your own `.env` (the real local value, never committed).
Done when: `docker ps` shows the container running, and you've connected to it once with `psql` and seen it's empty.
Commit: `chore: add local Postgres via Docker for backend development`
- [x] Owner review: I checked it and said "approved"

Steps 31–35 were written as one batch of recipes at the owner's request (2026-10-05), since none of them depend on the parent app's design. Each is still implemented, verified, approved and committed one at a time.

### Step 31: Install Prisma and connect it to that database
Recipe: `docs/backend/step-31-install-prisma.md`
- [x] Install `prisma@7` and `dotenv` as dev dependencies (pinned to 7: npm's `latest` tag for `prisma` was an 8.0 release candidate on 2026-10-05).
- [x] Hand-write `prisma/schema.prisma` (generator + datasource, no models) and `prisma.config.ts` (loads `.env`, reads `DATABASE_URL`), instead of `prisma init`.
- [x] `npx prisma validate` passes, and `SELECT 1` through `npx prisma db execute --stdin` succeeds.
Done when: the Prisma CLI reaches the local database, and lint and typecheck still pass.
Commit: `chore(db): install Prisma and connect it to local Postgres`
- [x] Owner review: I checked it and said "approved"

### Step 32: First Prisma model (`School`) and first migration
Recipe: `docs/backend/step-32-school-model-first-migration.md`
- [x] `School` model and `NotificationPreference` enum in `schema.prisma`, matching Phase 1's `schoolSchema` (theme as JSON, plus `createdAt`/`updatedAt`).
- [x] `npx prisma migrate dev --name add_school` creates and applies the first migration. The SQL is read and committed.
Done when: `npx prisma migrate status` is up to date, and `psql` shows an empty `School` table.
Commit: `feat(db): add School model and first migration`
- [x] Owner review: I checked it and said "approved"

### Step 33: Generate the Prisma Client and prove it end to end
Recipe: `docs/backend/step-33-prisma-client-and-seed.md`
- [x] Install `@prisma/client@7`, `@prisma/adapter-pg@7` and (dev) `tsx`. Generate the client into `src/generated/prisma` (gitignored and prettier-ignored, regenerated by a `postinstall` script).
- [x] `src/lib/db.ts`: one shared `PrismaClient` with the `pg` adapter, cached on `globalThis` in development.
- [x] `prisma/seed.ts` upserts Phase 1's three demo schools (same ids) and reads them back. Wired up as `npx prisma db seed`.
Done when: seeding twice prints the same three schools, and lint, typecheck, test, check:tokens and build still pass.
Commit: `feat(db): generate Prisma Client and seed the demo schools`
- [x] Owner review: I checked it and said "approved"

### Step 34: Give CI its own Postgres
Recipe: `docs/backend/step-34-postgres-in-ci.md`
- [x] A `postgres:18` service container and a job-level `DATABASE_URL` in `.github/workflows/ci.yml`.
- [x] A "Set up the database" step after `npm ci`: `npx prisma migrate deploy`, then `npx prisma db seed`.
Done when: a pushed commit's CI run shows the migration applied and three schools seeded, and the whole run is green.
Commit: `ci: run Postgres in CI and apply migrations`
- [x] Owner review: I checked it and said "approved"

### Step 35: Swap the school repository for a real Prisma-backed one
Recipe: `docs/backend/step-35-prisma-school-repository.md`
- [x] Move the parent notification display helpers into `notification-format.ts`, so client components no longer import the repositories (otherwise `pg` is pulled into the browser bundle and the build fails).
- [x] `/parent/signup` renders per request (`connection()`), so its school list isn't frozen at build time.
- [x] `prisma-school-repository.ts` implements `SchoolRepository` with a Zod-checked `toSchool` mapper, plus unit tests for the mapper. `index.ts` exports it as `schoolRepository`. The mock singleton is removed, and the mock factory stays for tests.
Done when: a changed school setting survives a dev-server restart, and lint, typecheck, test, check:tokens, build and CI pass.
Commit: `feat(db): read and write schools through Prisma`
- [x] Owner review: I checked it and said "approved"

Steps 36–40 were written as one batch of recipes at the owner's request (2026-10-08), finishing the move of every staff-side table into Postgres before the gate hardware work. Each is still implemented, verified, approved and committed one at a time.

### Step 36: Give the browser tests their own database, reset before every run
Recipe: `docs/backend/step-36-e2e-test-database.md`
- [x] Move the seed's inserts into `prisma/demo-data.ts` (`insertDemoData`, `printDemoDataSummary`), reused by `prisma/seed.ts`.
- [x] `prisma/reset-demo.ts` (`npm run db:reset`): refuses anything but localhost, `TRUNCATE "School" CASCADE`, then the demo data.
- [x] Playwright `globalSetup` migrates and resets the database named by `E2E_DATABASE_URL`, and the test server uses it. `.env.example` and CI set it.
Done when: `npx playwright test` passes twice in a row against `talaan_test`, and your own `talaan` database is untouched.
Commit: `test(e2e): run browser tests against their own reset database`
- [x] Owner review: I checked it and said "approved"

### Step 37: Staff in Postgres
Recipe: `docs/backend/step-37-staff-model.md`
- [x] `Staff` model with `Role`/`StaffStatus` enums and a `schoolId` foreign key (`onDelete: Restrict`), migration `add_staff`.
- [x] `prisma-staff-repository.ts` with `toStaff`/`toStaffData` and unit tests. `index.ts` exports it, and the mock singleton is removed.
- [x] Staff seeded in order, one row at a time.
Done when: an invited teacher survives a dev-server restart, `psql` refuses a staff row for a school that doesn't exist, and every check passes.
Commit: `feat(db): store staff in Postgres`
- [x] Owner review: I checked it and said "approved"

### Step 38: Students in Postgres
Recipe: `docs/backend/step-38-student-model.md`
- [x] `Student` model with `birthDate` as a `DATE` and one `(schoolId, lrn)` index, migration `add_student`.
- [x] `prisma-student-repository.ts` (UTC-safe dates, case-insensitive link-a-child lookup) with unit tests, including a round trip. The mock singleton is removed.
- [x] Students seeded with one `createMany`.
Done when: an edited student survives a restart with the same birth date, a parent can link a child by LRN, last name and birth date, and every check passes.
Commit: `feat(db): store students in Postgres`
- [x] Owner review: I checked it and said "approved"

### Step 39: ID cards in Postgres
Recipe: `docs/backend/step-39-card-model.md`
- [x] `partialIndexes` preview feature. `Card` model with a unique `serial` and the partial unique index `Card_one_active_per_student`, migration `add_card`.
- [x] `prisma-card-repository.ts` with unit tests. The mock singleton is removed.
- [x] Cards seeded after students.
Done when: `psql` refuses a second active card for a student but accepts a lost one, a replaced card survives a restart, and every check passes.
Commit: `feat(db): store ID cards in Postgres`
- [x] Owner review: I checked it and said "approved"

### Step 40: Taps and alerts in Postgres
Recipe: `docs/backend/step-40-tap-and-alert-models.md`
- [x] `Tap` model (device-made id, nullable `studentId`) and `Alert` model (one-to-one with its tap), migration `add_tap_and_alert`.
- [x] `prisma-tap-repository.ts` and `prisma-alert-repository.ts` with unit tests. Both mock singletons are removed.
- [x] Taps, then alerts, seeded.
Done when: a simulated tap and a lost-card alert survive a restart, the browser tests pass twice in a row, and every check passes.
Commit: `feat(db): store taps and alerts in Postgres`
- [x] Owner review: I checked it and said "approved"

Steps 41–43 were written as one batch of fast-track recipes on 2026-10-09, while Step 37 was being checked. Each is built, checked by the owner, approved and committed one at a time.

### Step 41: Parents and parent–child links in Postgres
Recipe: `docs/backend/step-41-parent-models.md`
- [x] `src/lib/password.ts` (`hashPassword`, `passwordMatches`, scrypt from Node, no new dependency) with unit tests.
- [x] `Parent` (unique email, `passwordHash`) and `ParentStudentLink` (unique per parent and student) models, migration `add_parent_and_link`.
- [x] Prisma parent and link repositories with unit tests. Both mock singletons removed. Parents and links seeded, with the demo password stored hashed.
Done when: a new parent and their linked child survive a restart, `psql` shows only `scrypt:` hashes, and every check passes.
Commit: `feat(db): store parents and links in Postgres, with hashed passwords`
- [x] Owner review: I checked it and said "approved"

### Step 42: Parent notifications in Postgres
Recipe: `docs/backend/step-42-notification-model.md`
- [x] `Notification` model and `NotificationKind` enum, migration `add_notification`.
- [x] `prisma-notification-repository.ts` with unit tests. The last mock singleton is removed.
- [x] Notifications seeded.
Done when: "mark all read" and a simulated tap's notification both survive a restart, and every check passes.
Commit: `feat(db): store parent notifications in Postgres`
- [x] Owner review: I checked it and said "approved"

### Step 43: Gate devices, their tokens, and the first `/api/v1` endpoint
Recipe: `docs/backend/step-43-gate-devices.md`
- [x] `Device` model (`tokenHash` unique, `status`, `lastSeenAt`), migration `add_device`, the app's `Device` type and a Prisma repository.
- [x] `src/services/devices/`: token generation, sha256 hashing, `Bearer` parsing and `authenticateDevice`, with unit tests.
- [x] `npm run device:create` prints a new device's token once. `POST /api/v1/devices/heartbeat` answers 200 for an active token and 401 otherwise.
Done when: the `curl` checks in the recipe give 200, 401, 401, 405, a revoked device gets 401, and every check passes.
Commit: `feat(api): gate devices with tokens and a heartbeat endpoint`
- [x] Owner review: I checked it and said "approved"

### Step 44: The real clock, in Philippine time
Recipe: `docs/backend/step-44-real-clock.md`
- [x] `src/lib/school-time.ts` (school date, minutes, formatting and the reverse conversion, fixed UTC+8) and `src/lib/clock.ts` (`getNow`, `DEMO_NOW`), with unit tests.
- [x] `status.ts` works on a `SchoolDay` (date, how far into it, the two cutoffs) instead of `DASHBOARD_NOW`, which is removed. Every page and component passes the day through. A "Demo clock" badge shows when the clock is pinned.
- [x] `TapRepository.listBySchoolOnDate`, used by every page that shows one day. The Attendance page defaults to today and handles past and future dates. Simulate a tap and the tap station use the real clock.
- [x] Seed taps, the alert and notifications become real instants (same times on screen). Playwright pins `DEMO_NOW`, and `.env.example` documents it. Existing tests move to real instants.
Done when: `npm run dev` shows today with the real Philippine time on a simulated tap, the demo morning looks the same as before with `DEMO_NOW` set, and every check passes.
Commit: `feat(time): real clock in Philippine time, with a pinnable demo clock`
- [x] Owner review: I checked it and said "approved"

### Step 44.5: Each school sets its own late and absent times
Recipe: `docs/backend/step-44.5-attendance-times.md`
- [x] `lateAfter`/`absentFrom` on `School` (text "HH:MM", defaults 08:05 and 09:00), migration `add_school_attendance_times`, carried by the schema and repository.
- [x] Settings › Attendance times form and `updateAttendanceTimes` action (principal and super admin only, absent must be after late).
- [x] Every day calculation uses the school's own times, with unit tests for a school whose times differ.
Done when: a changed late time changes the dashboard's late count, an absent time before the late time is refused, and every check passes.
Commit: `feat(settings): each school sets its own late and absent times`
- [x] Owner review: I checked it and said "approved"

### Step 44.6: Weekends have no late or absent
Recipe: `docs/backend/step-44.6-weekends.md`
- [x] `isWeekend(date)` in `school-time.ts`. `SchoolDay` gains `flexible`, and `studentStatus` never returns late or absent on a Saturday or Sunday.
- [x] Weekend words: `statusLabel` ("Came in", "No tap") shared by the status pill, legend and tiles. The dashboard hero says "came in" and "Weekend: no late or absent times." Every screen passes `day.flexible`.
- [x] The seed demo day, Playwright's `DEMO_NOW` and `.env.example` move to Friday 19 June 2026. Tests follow, plus new weekend tests.
Done when: a Saturday `DEMO_NOW` shows no Late or Absent anywhere, the Friday demo morning looks the same as before, and every check passes.
Commit: `feat(attendance): weekends have no late or absent`
- [x] Owner review: I checked it and said "approved"

### Step 44.7: Link a real card
Recipe: `docs/backend/step-44.7-link-real-card.md`
- [x] `normalizeCardSerial` (the reader's 10 digits, or 4- or 7-byte hex), `firstFourBytes` and `findSerialConflict` in `card-serial.ts`, with unit tests.
- [x] `CardRepository.listBySerialPrefix` (Prisma and mock), and the `linkRealCard` server action.
- [x] The drawer's waiting state has a focused Card serial field, where Enter links the card. Simulate a card tap stays. The browser test links a card the way the reader does.
Done when: a sticker tapped on the USB reader in the drawer links to the student, the same sticker is refused for a second student, and every check passes.
Commit: `feat(students): link a real card from the USB reader`
- [x] Owner review: I checked it and said "approved"

### Step 45: The tap service
Recipe: `docs/backend/step-45-tap-service.md`
- [x] `matchCard` (exact, else the first 4 bytes, never a guess between two) and `chooseTapTime`, with unit tests. `normalizeCardSerial` comes from Step 44.7.
- [x] `TapRepository.findByCardBetween`, and a `TapWriter` that saves the tap, its alert or notification, and the gate's `lastSeenAt` in one transaction.
- [x] `recordTap()` in `src/services/taps/`: retry-safe by the gate's tap id, 2-minute debounce by card, lost-card alert, notification per the school's setting. The notification rule is shared with `notifyParentsForTap`. Unit tests with in-memory fakes.
- [x] `npm run tap:record -- --token …` records taps typed or scanned into the terminal, through `recordTap()`.
Done when: a sticker scanned into `tap:record` comes back as an unknown card, a seed card as time in and then duplicate, a lost card raises an alert on the dashboard, and every check passes.
Commit: `feat(gate): the tap service, with card matching and a 2-minute debounce`
- [x] Owner review: I checked it and said "approved"

### Step 46: The tap API and the gate's roster
Recipe: `docs/backend/step-46-tap-api.md`
- [x] `authenticateGate` (401 for a bad token, 403 for a monitor), `gateTapRequestSchema`, and `toGateTapResponse` (nothing personal), with unit tests.
- [x] `POST /api/v1/gate/taps`: a thin wrapper around `recordTap()`.
- [x] `GET /api/v1/gate/roster`: active cards and students (`CardRepository.listActiveBySchool`, `buildGateRoster`), with an ETag and `304 Not Modified`.
Done when: the recipe's `curl` checks give 200 with an ETag, then 304, a recorded tap then a duplicate, 403 for a monitor, 400 for a bad body, and every check passes.
Commit: `feat(api): the gate's tap and roster endpoints`
- [x] Owner review: I checked it and said "approved"

### Step 46.5: Student photos
Recipe: `docs/backend/step-46.5-student-photos.md`
- [x] `PhotoStorage` with a local-folder version (development) and an S3-compatible version for Cloudflare R2 (`aws4fetch`, approved 2026-10-11), chosen by `PHOTO_STORAGE`. `.env.example` documents the settings.
- [x] `Student.photoUrl` becomes `photoKey` (migration `student_photo_key`, a column rename). `newPhotoKey`, `detectPhotoType` and `MAX_PHOTO_BYTES`, with tests.
- [x] The drawer's Photo section: the camera or a file, resized in the browser to a 256×256 WebP or JPEG, then `uploadStudentPhoto` and `removeStudentPhoto`. `StudentAvatar` shows the photo everywhere.
- [x] `GET /api/v1/photos/[...key]` for the same school's staff, gate or monitor only (404 otherwise), cached privately for a year. The roster gains `photo`.
- [x] Review change (2026-10-12): photos are a 4:5 portrait (256 × 320), large at the gate and on the monitor and a small rectangle in every list, with a hint asking for 600 × 750 or larger.
- [x] Review change (2026-10-12): the drawer's photo and card are held until the student form's Save, and Cancel or Undo throws them away. A card tapped by mistake is never linked or marked lost. A new student can get both in the Add form.
Done when: a photo added in the drawer shows in the lists, is about 15 KB in `.data/photos`, gives 404 without access and 200 with a Balanga gate token, and every check passes.
Commit: `feat(students): student photos, stored as small thumbnails`
- [x] Owner review: I checked it and said "approved"

### Step 47: The `/gate` page
Recipe: `docs/backend/step-47-gate-page.md`
- [x] Setup with `?token=` or a pasted token, a heartbeat once, the token kept on the tablet, a clock warning, and Disconnect.
- [x] Reader input with no on-screen keyboard (`createScanBuffer`), and Android NFC where supported. Every scan is sent at once and never waits for another. Results by outcome, in status colours, announced in an `aria-live` region.
- [x] The tablet's own roster (ETag, every 5 minutes) and photo cache, wiped on a 401. Phone full screen, tablet split with Recent, and an idle clock.
- [x] Unit tests, and `e2e/gate.spec.ts`: a test-only gate token, a reader-style typed scan giving Time in and then Already tapped, at both widths.
- [x] Review fixes (2026-10-12): taps are read even after a button was clicked, with a banner when the page lacks the keyboard; photos load after a reload, not only on the first visit.
- [x] Review change (2026-10-12): a refined tap card (`tap-card.tsx`) for every state: a white card, the 4:5 portrait, a badge, then a TIME IN (green) / TIME OUT (blue) / FIRST TAPPED AT (amber) stamp, or what to do next.
Done when: a linked sticker tapped on the USB reader shows the student and Time in, three quick taps all land, and every check passes.
Commit: `feat(gate): the gate page for the tablet and USB reader`
- [x] Owner review: I checked it and said "approved"

### Step 48: The `/gate/display` guardhouse monitor
Recipe: `docs/backend/step-48-gate-monitor.md`
- [x] `tapEvents` (in-memory, one channel per school), published by the tap API and Simulate a tap. `GET /api/v1/gate/stream` (server-sent events, a keep-alive every 25 s).
- [x] Who may watch: a monitor device's cookie (`/gate/display/connect?key=…`), or a principal or super admin session. Teachers and everyone else get nothing.
- [x] The `/gate/display` page (newest large, the previous 11 below, Reconnecting…), and an Open gate monitor link on the dashboard.
- [x] Unit tests, and `e2e/gate-monitor.spec.ts`: a tap through the API appears on the open monitor with no reload.
- [x] Review change (2026-10-12): the monitor uses the gate's tap card and list item, so both screens look alike.
Done when: a sticker tapped at `/gate` appears on `/gate/display` within a second, a revoked monitor stops, and every check passes.
Commit: `feat(gate): the live guardhouse monitor`
- [x] Owner review: I checked it and said "approved"

### Step 49: Time in and time out on the attendance page
Recipe: `docs/backend/step-49-time-in-time-out.md`
- [x] `dayTapSummary`: each tap labelled, with time out only when the last tap is a time out. Unit tests.
- [x] A Time out column (desktop), "In … · Out …" (phone), and an "N taps" button opening the full list in a dialog when there are more than 2 taps.
- [x] Two seed students with a comings-and-goings morning (counts unchanged), and a browser test of the taps dialog.
Done when: the demo morning shows a time out and a 3-taps list, the counts are still 21 / 6 / 13, and every check passes.
Commit: `feat(attendance): time in and time out, with every tap of the day`
- [x] Owner review: I checked it and said "approved"

### Step 50: Signed staff sessions
Recipe: `docs/backend/step-50-staff-sign-in.md`
- [x] `SESSION_SECRET` (`src/lib/env.ts`), `signValue`/`readSignedValue` (HMAC with a purpose and an expiry), and `Staff.passwordHash` with a unique, lower-case email (migration `staff_password`). Seed staff get `Talaan123!`. Adding staff or a school refuses an email already in use.
- [x] The `talaan_session` cookie is signed and carries a password fingerprint (`pv`). `getSession()` returns null when signed out, `requireSession()` sends pages to the sign-in screen, and every page and action handles both.
- [x] The dev switcher and the demo shortcuts set the signed cookie (still development only). A super admin who opens a school stays a super admin.
- [x] The browser tests sign in with signed cookies, made with a fixed test secret. Unit tests for signing, the session and the repositories.
Done when: signed out, `/dashboard` goes to the sign-in screen; a demo shortcut signs in; an edited cookie is signed out; a super admin who opens Balanga is still a super admin; and every check passes.
Commit: `feat(auth): signed staff session cookie, and signed out by default`
- [x] Owner review: I checked it and said "approved"

### Step 50.1: The real sign-in form
Recipe: `docs/backend/step-50.1-sign-in-form.md`
- [x] The sign-in form checks the real password (`findForSignIn`, `passwordMatches`), with one answer for every failure and a 5-tries-in-15-minutes limit per email.
- [x] Sign out in the top bar and the mobile drawer; `/` goes to the dashboard when already signed in.
- [x] The parent portal's cookie is signed (`talaan_parent_session`), and parent sign-in uses the same limit.
- [x] Unit tests for the limit and the sign-in action, and browser tests for sign-in, a wrong password, sign out and a forged cookie.
Done when: the principal signs in with `Talaan123!`; the fifth wrong password says "Too many tries"; Sign out works; a hand-typed parent cookie is ignored; and every check passes.
Commit: `feat(auth): real staff sign-in, sign out, and a signed parent cookie`
- [x] Owner review: I checked it and said "approved"

### Step 50.5: Set-password links
Recipe: `docs/backend/step-50.5-set-password-links.md`
- [x] `makeSetPasswordToken`/`readSetPasswordToken`: signed, 7 days, and dead once used (through the password fingerprint).
- [x] The link dialog after Add staff, "Copy sign-in link" and "Copy password reset link" in the staff ⋮ menu, and the new principal's link after Add school (changed 2026-10-12: the Schools page has no ⋮ menu; see the recipe).
- [x] `/set-password`: set a password, become active, and sign in. `npm run staff:link`, including `--create-super-admin`.
- [x] Unit tests, and a browser test of add, copy, set, and a used link refused.
Done when: a teacher added on the Staff page signs in through their link, the same link then says it was used, and every check passes.
Commit: `feat(auth): set-password links for new staff and password resets`
- [x] Owner review: I checked it and said "approved"

### Step 51: One school can never see another's data
Recipe: `docs/backend/step-51-school-isolation.md`
- [x] Repository lookups by id take `schoolId` (`getInSchool`, and `update`, `remove`, `markLost`, `markRead` scoped), in Prisma and in the mocks. Every caller is updated. Also fixed (2026-10-12): the tap station's save trusted the school in the browser's tap.
- [x] `docs/SCHOOL-ISOLATION.md`: every way into the data and where its school comes from, plus why row-level security waits.
- [x] Isolation tests: every action called as Oceanview with Balanga's ids, the Prisma `where` clauses against the test database, and `e2e/isolation.spec.ts` for pages, photos, the gate and link-a-child (the monitor's stream is covered by unit tests only; see the recipe).
Done when: every isolation test passes and every check passes.
Commit: `feat(security): scope every lookup to the school, with isolation tests`
- [x] Owner review: I checked it and said "approved"

### Step 51.5: The new name, Bantay Aral, on every screen
Recipe: `docs/backend/step-51.5-product-name.md` (written from the real diff). Decided 2026-10-13: talaan.com wasn't available, so the owner chose **bantayaral.com**, written **Bantay Aral** on screens (two words, so it reads naturally and screen readers say it right). Only what people see changes.
- [x] Every place a person sees the product's name says "Bantay Aral": the page titles, the sign-in screen, the parent portal, the set-password page, the gate and monitor pages, and "ask your Talaan administrator". The name lives in one constant, so a later rename is one line.
- [x] The code name stays `talaan` (owner decision, 2026-10-13): the repository, the npm package, the database and Docker container, cookie names, token prefixes (`tal_dev_`, `tal_par_`), environment variables and the code itself. The demo password `Talaan123!` stays too.
- [x] `CLAUDE.md` and `README.md` say both: the product name Bantay Aral, and the code name Talaan.
- [x] Tests that check a page title or the sign-in screen's words updated.
Done when: no screen shows "Talaan", and every check passes.
Commit: `feat(brand): the product is called Bantay Aral on every screen`
- [x] Owner review: I checked it and said "approved"

### Step 51.6: The Bantay Aral logo, and a new sign-in page
Recipe: `docs/backend/step-51.6-logo-and-sign-in.md` (written from the real diff). Owner request, 2026-10-13: the owner brought a logo, a brand sheet with a sample sign-in page, and a photo, and chose to build it before the deploy (it was planned as Step 54.5). The logo is redrawn as SVG. The owner's clean photo replaced the first stand-in crop.
- [x] Brand colors as fixed tokens (`--brand-*`, light and dark), separate from the school's theme and from the status colors. A darker green for text that passes 4.5:1.
- [x] The mark redrawn as SVG (`src/components/brand/`), the word in Lexend, and `BantayAralLogo` in three sizes, labelled "Bantay Aral" for screen readers.
- [x] The browser tab icon and the phone home-screen icon, generated from the same mark. Next's default `favicon.ico` is gone.
- [x] The sign-in panel from the brand sheet: logo, pill, two-tone headline, three points, and the photo in a 4:3 rounded frame (review change: it was an oval) showing the student, card and reader, with a live "Juan tapped in" card under the reader. The logo on phones. On every sign-in screen the logo links back to the main page (review change). The same on parent sign-in, sign-up and set-password.
- [x] The logo in the parent portal's header, and in the staff sidebar when no school is open.
- [x] The owner's clean photo (no text, bubble or circles) replaces the stand-in at `public/brand/sign-in-photo.jpg`.
Done when: the logo and the new sign-in page look right at 360, 1024, 1280 and 1536 px in light and dark, and every check passes.
Commit: `feat(brand): the Bantay Aral logo and a new sign-in page`
- [x] Owner review: I checked it and said "approved"

### Step 52: Deploy the demo to Heroku
Recipe: `docs/backend/step-52-deploy-heroku.md`
- [x] Owner: Heroku account with the GitHub Student credit, the app, Postgres Essential-0 (version 18), config vars, and automatic deploys after CI. Cloudflare R2 bucket and token. Name the Heroku app after the product, for example `bantayaral` (added 2026-10-13); pointing `bantayaral.com` at it can come later.
- [x] `Procfile` (release: `prisma migrate deploy`), `engines`, and `prisma`, `tsx` and `dotenv` moved to `dependencies`.
- [x] `checkProductionEnv` in `src/instrumentation.ts`, and `GET /api/v1/health`.
- [x] `docs/DEPLOY.md`. First deploy: seed, the owner's super admin, a gate token and a monitor key.
Done when: the health check is ok, a photo lands in R2, a sticker tapped at the live `/gate` appears on the live monitor, and a push to `main` deploys by itself after CI.
Commit: `chore(deploy): run on Heroku with Postgres and R2 photos`
- [x] Owner review: I checked it and said "approved"

### Step 53: One parent account for any number of schools
Recipe: `docs/backend/step-53-parent-accounts-across-schools.md`. Split from the parent API on 2026-10-15 (owner approval), so each half fits one review. Owner decision 2026-10-13, `docs/SCALING.md` 2.1.
- [x] `Parent.schoolId` removed (migration `parent_any_school`), and the parent session carries only the parent.
- [x] Sign-up asks for no school. "Link a child" asks for the school as well as the LRN, last name and birth date.
- [x] Every parent page reads each link's own school, and each child's day uses that school's times. A child's card shows the school's name when the parent's children are at more than one school.
- [x] `docs/SCHOOL-ISOLATION.md`'s parent row, `e2e/parent.spec.ts` and `e2e/isolation.spec.ts` updated, plus a test of one parent with children at two schools.
Done when: one parent links children at two schools and sees both, the demo parents work as before, and every check passes.
Commit: `feat(parents): let one parent account link children at any school`
- [x] Owner review: I checked it and said "approved"

### Step 53.1: Parent sign-in services
Recipe: `docs/backend/step-53.1-parent-sign-in-services.md`, written from the real diff. Split from the parent API on 2026-10-16 (owner approval), after three plan reviews with the systems-architect: the API recipe was too big for one sitting, so it became Steps 53.1–53.4.
- [x] `src/services/parents/`: `registerParent`, `checkParentSignIn` and `linkChildToParent`, with no Next.js imports, so the web portal's actions and the parent API (Step 53.3) share them. The actions keep their answers.
- [x] Parent sign-in checks a password even for an unknown email (a decoy hash), so the answer's timing doesn't give away who has an account.
- [x] Parent emails are stored trimmed and in lower case, and looked up with the unique email index. Migration `parent_email_lowercase` lowercases existing rows, and stops with a clear message if two accounts would then share an email.
- [x] Two sign-ups with one email, or one link sent twice at once, get "email taken" or "already linked" instead of an error.
Done when: the web parent portal works as before, and every check passes.
Commit: `feat(parents): move parent sign-in into services and store emails in lower case`
- [x] Owner review: I checked it and said "approved"

### Step 53.2: Paged parent data
Plan: `docs/SCALING.md` 2.2. Reviewed with the systems-architect on 2026-10-16 (two more rounds, no blocking concerns). Kept as one step (owner decision, 2026-10-16). Its recipe is written from the real diff.
- [x] Each child's taps for today (`listByStudentOnDate`, reused by Step 61) and their last 10 taps (`listRecentByStudent`), through a `childrenToday` service. The card's "Attendance history" of every tap ever becomes "Recent taps", the last 10 (owner decision, 2026-10-16).
- [x] Notifications a page at a time, newest first by `(tappedAt, id)`: one query per child, one after another, merged with the same order. "Show older" carries an opaque cursor (base64url of `<tappedAt>|<id>`, ids limited to `[a-z0-9-]`), written into `docs/PARENT-APP-BRIEF.md` as `nextBefore`. Tested against Postgres too, for ties. Changed while building: ids must be a lowercase UUID or the seed's `notification-0001`, since Postgres and JavaScript order other hyphenated ids differently (`docs/PROBLEMS-LOG.md`, P-017).
- [x] The unread count is counted by the database, one capped count per child (newest first, so Postgres can stop at the 10th), and stops at 10: the bell shows "9+" and says "more than 9 unread". "Mark all read" and "mark read" are one query each, limited to each linked child at that child's school. The feed shows "Mark all as read" from the count, not from the page in view.
- [x] The bell gets the newest 5 and the count, so the browser never receives the whole history. The feed shows 30 with "Show older" and "Back to newest". The parent's links are read once per page (React `cache`). Added by the code review: a notification reaches the browser with only the child's id and name (P-018).
Done when: a parent page loads the same number of rows in a child's fifth year as in their first, except the unread count, which is bounded by one child's own notifications (never all children's or the school's). Every check passes.
Commit: `perf(parents): load parent data one day or one page at a time`
- [x] Owner review: I checked it and said "approved"

### Step 53.3: Parent tokens and the sign-in API
Recipe: `docs/backend/step-53.3-parent-sign-in-api.md`, written from the real diff. Plan reviewed with the systems-architect on 2026-10-16 (two rounds, no blocking concerns), kept as one step.
- [x] `ParentToken` (migration `parent_tokens`), and `issueParentToken`/`authenticateParent` (hashed, revocable, 90 days from last use). `PushToken` moved to Step 53.4, linked to the sign-in token.
- [x] A per-address sign-in limit beside the per-email one, so trying many emails is limited too, plus a sign-up limit per address, each in its own bounded memory (`docs/PROBLEMS-LOG.md`, P-020 and P-021).
- [x] `/api/v1/parents/*`: schools, signup, login, logout, me, children (link a child), a child's taps, with one error shape mapped from the services' `code`s.
- [x] Sign-up and the token are not wrapped in one database transaction around `registerParent` (a caught unique-email error would abort it). A retried sign-up answers "email taken", so the app treats that as "sign in instead".
Done when: the sign-up, login and `/me` `curl` checks work, and every check passes. The parent app can start calling these.
Commit: `feat(api): add parent tokens and the parent sign-in API`
- [x] Owner review: I checked it and said "approved"

### Step 53.4: The parent notifications API
Recipe: `docs/backend/step-53.4-parent-api.md`, the part after the sign-in addresses, with Step 53.3's review notes at its top, and "What Step 53.4 built" from the real diff. Plan reviewed with the systems-architect on 2026-10-16 (one round, nothing blocking).
- [x] `/api/v1/parents/notifications` (with `before` and `limit`), `…/:id/read`, `…/read-all` and `push-tokens`. From Step 53.2's review: clamp `limit` (1–50; a negative `take` reverses Prisma's order), and answer a cursor that doesn't decode with `400`, not the first page. The app registers an Expo push token (owner decision, 2026-10-13), since Step 54 sends through Expo's push service.
- [x] Parent tokens can load their own children's photos, and no one else's.
- [x] From Step 53.3's review: `PushToken.parentTokenId` with `onDelete: Cascade`, and logout deletes that phone's push token. Changed while building: `parentTokenId` is unique (one push address per signed-in phone), there's no `parentId` (the sign-in's parent is the one), and registering is a delete and a create in one batch, tried once more after a clash (architect review).
- [x] `docs/PARENT-API.md`, unit tests, and `e2e/parent-api.spec.ts` (sign up, link, tap, notification, read, logout).
Done when: the `curl` checks in the recipe work, `docs/PARENT-API.md` is ready to copy into the app's repository, and every check passes.
Commit: `feat(api): add the parent notifications API for the mobile app`
- [x] Owner review: I checked it and said "approved"

## Phase 2b: ready for real schools (added 2026-10-13)
On 2026-10-13, before the first deploy, the owner asked for a review of the whole app, looking for anything that works for one school but gets worse with more schools, bigger schools or more years. It's written up in `docs/SCALING.md`. Each step below fixes one or more of its items, in the order they're due. Step 54 (push) comes first because the demo needs it. Steps 55–64 follow the demo, one at a time. None of these steps has a recipe yet: each gets one, approved by the owner, before its code. Any step can be split if it grows too big for one sitting.

### Step 54: Push notifications reach the phone
Recipe: `docs/backend/step-54-push-notifications.md`, approved by the owner on 2026-10-16 after one plan review with the systems-architect. Plan: `docs/SCALING.md` 2.3, from the plan's after-demo list (the notification outbox and its worker). Moved up to come right after Step 53 on 2026-10-13: the demo needs a tap at the gate to buzz a parent's phone. Its last check needs the parent app to register a push token (`docs/PARENT-APP-BRIEF.md`, app step M7), so it can be finished while the app is being built.
- [x] The `Notification` row is the outbox (`pushedAt`). The worker writes one delivery record per phone (waiting, sending, sent, failed, tries) when it sends, in the same transaction that marks the notification pushed (owner decision, 2026-10-16: not in the tap's own transaction). Old notifications are marked pushed by the migration and the seed.
- [x] Which phones: every push address of the child's linked parents whose sign-in isn't revoked, however long unused. A sign-in with a push address is no longer cleared after 90 days (owner decision, 2026-10-16, the 90-day question from Step 53.4's review).
- [x] A worker inside the web dyno ($0; a worker dyno would be $7 a month) that sends batches through Expo's push service (free; it delivers through Firebase Cloud Messaging on Android and Apple's push service on iOS), behind a `PushSender` (`PUSH_SENDER=expo|log`, `EXPO_ACCESS_TOKEN`). It retries with a growing wait for up to 6 hours, and drops a phone Expo says is gone. The child's first name only on the lock screen.
- [x] Tests: a failed send is retried, a phone that's gone is dropped, two claims never take the same row (Postgres), and a gate tap reaches the `log` sender. `docs/PUSH.md`.
Done when: every check passes, and once the app's M7 is done, a tap at the gate arrives on a test phone as a push.
Commit: `feat(push): send tap notifications to parents' phones`
- [x] Owner review: I checked it and said "approved"

### Step 54.1: Push receipts and cleanup
Recipe: `docs/backend/step-54.1-push-receipts.md`, approved by the owner on 2026-10-19 after one plan review with the systems-architect and the owner's own review ("Bantay Aral Push Flow", https://claude.ai/artifact/PgnXN3SSqE8DMRTudHWqAa). Split from Step 54 on 2026-10-16. Owner's principle (2026-10-19): the tap's saved time is what matters; a push may be a few minutes late, so background checks run every 5 minutes, not every few seconds.
- [x] Expo's receipts, checked at most every 5 minutes and only when nothing is waiting to be sent: a phone that's gone is dropped, a push Expo was too busy to send is sent again, and a delivered push's row is deleted at once (nothing about a success is kept). Failed pushes are kept 7 days, then deleted.
- [x] The worker's background check runs every 5 minutes instead of every 30 seconds (owner decision). New taps still wake it straight away; only retries wait longer.
- [x] A parent's sign-in lasts **30 days from its last use** (was 90), and opening the app counts as use. A sign-in unused for 30 days is cleared, push address and all, by the hourly cleanup: the parent signs in again to keep getting pushes (owner decision, 2026-10-19).
- [x] From Step 54's code review: a whole request Expo refuses (`http_400`) is retried one message at a time, so one bad message can't hold back the other 99, but only fails a message alone if another went through.
- [x] The rules above written plainly in `README.md` and `docs/PUSH.md`, and the 30 days in `docs/PARENT-API.md`, `docs/PARENT-APP-BRIEF.md` and `docs/AUTH.md`.
Done when: receipts and cleanup are tested against Postgres, and every check passes.
Commit: `feat(push): check push receipts, clear old rows and 30-day sign-ins`
- [x] Owner review: I checked it and said "approved"

### Step 55: Record a time in by hand
Re-scoped by the owner on 2026-10-20, for a demo to the principal the next day: the random "Simulate a tap" becomes a real, attributed way to record one chosen student's time in when their sticker fails or they have none. Plan reviewed by the systems-architect (two rounds). Recipe: `docs/backend/step-55-record-time-in.md`, written from the real diff (owner decision, 2026-10-20, because of the demo). The rest of the old Step 55 moved to Steps 55.1 and 55.2.
- [x] Migration `manual_taps`: `Tap.source` (`card` or `manual`, old taps `card`), `Tap.recordedById` (the staff member, kept as null if they're removed), and `Tap.cardSerial` nullable for a student with no card. The student's active card serial is kept when they have one, so the gate's 2-minute check also sees the recorded tap.
- [x] `recordManualTimeIn()` (`src/services/taps/`): a principal or super admin for anyone at their school, a teacher only their own advisory class; refused once the student has any tap today; recorded as now. One fixed id per student per day, written through the gate's `tapWriter` with its parent notification, so two clicks at once make one tap and one notification. The guardhouse monitor and the push worker are told, as for a gate tap.
- [x] "Record time in" where the time in will appear on today's attendance (the Time in cell on desktop, under the status on a phone card), only while the student has no tap, with a confirmation first. "Recorded by staff" under a time recorded by hand. The dashboard's "Simulate a tap" button and `simulateTap` are gone.
- [x] Tests: the rules (another class, another school, already tapped, the school's setting off), two calls at once against Postgres, and a browser test on desktop and phone.
Done when: a teacher records one untapped student's time in from their row, the row shows the time and "Recorded by staff", parents get one notification, and every check passes.
Commit: `feat(attendance): record a student's time in by hand from their row`
- [x] Owner review: I checked it and said "approved"

### Step 55.1: Remove the tap station, and limit child linking
Plan: `docs/SCALING.md` 1.1 and 1.2, from the old Step 55. Changed on 2026-10-21 by the owner: `/station` is **removed** rather than switched per school (it no longer matched the real gate and monitor, and nobody needs it now that "Record time in" exists), and both halves are one step. The limits follow the systems-architect's round-1 review (2026-10-20). Recipe: `docs/backend/step-55.1-remove-station-limit-linking.md`, written from the real diff.
- [x] `/station`, its kiosk, its server action, the "Tap station" sidebar item and `station.spec.ts` removed, with the code only it used: the tap and alert repositories' `create`, `notifyParentsForTap`, `studentsWithoutTapToday` and `MAIN_GATE_STATION_ID`. Every tap is now written by the gate's or the hand-recorded writer, with its notification in the same transaction.
- [x] `parent.spec.ts` records a fixed student's time in instead of taking whoever the station tapped; `a11y.spec.ts` checks the "Record time in" dialog instead of the station; `isolation.test.ts` checks `recordTimeIn` across schools.
- [x] Wrong link tries limited per parent (5 in 15 minutes, in memory) and per child, in Postgres (migration `link_attempts`) so a restart can't reset it: 10 in 24 hours for one school, LRN and last name, keyed by an HMAC with the server's secret (no LRN stored). Each try is saved first, then counted, so tries sent all at once can't slip past; a right answer takes its try back. Old tries are cleared at most hourly, and the count only ever looks back 24 hours.
- [x] The locked message: "Too many tries for this student. Try again tomorrow." (owner decision, 2026-10-21). The API answers `429 too_many_tries` (`docs/PARENT-API.md`).
- [x] From the code review (P-028, Security): the child lookup and the staff email lookup no longer use Prisma's case-insensitive `equals` (an `ILIKE`, where `%` and `_` are wildcards, so `%` as a last name linked any child). A refused try is taken back, so retrying during a lock doesn't stretch it.
Done when: 50 link tries sent at once let through 10 at most, `/station` is gone, and every check passes.
Commit: `feat(security): remove the tap station and limit child linking`
- [x] Owner review: I checked it and said "approved"

### Step 55.2: Other guardians are told of each new link
Split from the old Step 55 on 2026-10-20: telling guardians needs a new kind of notification (today's are tap-only, one per child, with read marks shared by every guardian). Split again on 2026-10-22 by the owner: the school's side is Step 55.3. **Decided 2026-10-22 (owner): a principal does not approve links first**; it would only add work for the principal. Recipe first, approved before the code: `docs/backend/step-55.2-guardians-told-of-links.md`.
- [x] A notification can be for one parent only, and has a third kind, "a new guardian linked" (migration `guardian_link_notices`, plus `notification_recipient_check`, a CHECK constraint from the architect's code review).
- [x] Linking a child saves the link and one notice for each of the child's other guardians in one transaction, and wakes the push worker.
- [x] Each notice reaches only its parent: in the web feed and bell, the API's feed and unread count, the read marks, and the push.
- [x] The words in the feed, the push and the API (`docs/PARENT-API.md`).
Done when: a second guardian linking a child shows in the first guardian's feed and reaches their phone, never in the second guardian's own, and every check passes.
Commit: `feat(parents): tell a child's other guardians about each new link`
- [x] Owner review: I checked it and said "approved"

### Step 55.3: The school sees each link
Split from Step 55.2 on 2026-10-22 (owner). With no approval step, the school's remedy for a wrong link is seeing it and removing it. Cut in two on 2026-10-22 after the systems-architect's review (too big for one review): seeing is this step, removing is Step 55.4. Recipe first: `docs/backend/step-55.3-school-sees-links.md`.
- [x] The student drawer lists the child's linked parent accounts (name, mobile, date linked), for principals and super admins, from one query for the page's students.
- [x] The dashboard shows the school's new parent links from the last 7 days (migration `parent_links_by_school_and_date`: index `(schoolId, linkedAt)`).
Done when: a principal sees a new link on the dashboard and in the drawer, a teacher sees neither, and every check passes.
Commit: `feat(parents): show each school its parent links`
- [x] Owner review: I checked it and said "approved"

### Step 55.4: A principal removes a wrong link
Cut from Step 55.3 on 2026-10-22 (architect review). Removing and blocking ship together: without the block, a removed parent could link the child again a minute later. Recipe first: `docs/backend/step-55.4-remove-parent-link.md`.
- [x] "Remove" in the drawer's parent accounts, after a confirmation; the link is deleted with the parent's queued pushes about the child, and who removed it is kept.
- [x] The removed parent can't link that child again until the school chooses "Allow again"; the API answers `403 link_blocked`.
Done when: a principal removes a link, that parent no longer sees the child or gets a push about them, can't link them again, and every check passes.
Commit: `feat(parents): let a principal remove a parent link`
- [x] Owner review: I checked it and said "approved"

### Step 55.5: Email, and staff reset their own password
Plan: owner decision, 2026-10-13: people recover a forgotten password themselves, never by asking the school. Builds on the email notes in `docs/LEARNING-LOG.md` ("What would an email service cost?"). Cut in two on 2026-10-23 so each half can be reviewed in one sitting: email and staff are this step, parents are Step 55.6. Recipe first: `docs/backend/step-55.5-email-staff-reset.md`.
- [x] An email service behind a small interface (SMTP through `nodemailer`), sending from `mail.bantayaral.com`. Its cost (free at this size) and the DNS records the owner adds are stated first.
- [x] Staff get "Forgot your password?" by email on the web sign-in: a 1-hour set-password link, the same answer for every email, and limits per email, per network and per day. The principal's copy link (Step 50.5) stays as a backup.
- [x] Decided in the recipe: staff invitations stay a copy link, not an email.
Done when: a teacher who forgot their password signs in again without anyone's help, and every check passes.
Commit: `feat(auth): let staff reset a forgotten password by email`
- [x] Owner review: I checked it and said "approved"

### Step 55.6: Parents reset a forgotten password
Cut from Step 55.5 on 2026-10-23. Not needed for the demo. Due before real parents sign up. Uses Step 55.5's email service and daily limit. Recipe first: `docs/backend/step-55.6-parent-reset.md`, approved as one step on 2026-10-23.
- [x] Parents reset a forgotten password from the app and the web portal with a short-lived, one-time 6-digit code sent by email, stored only as a hash, with a limit on wrong tries. New API addresses for it, added to `docs/PARENT-API.md` and the app's starter kit (`mobile/starter/`).
- [x] A reset signs the parent out everywhere else: every phone's sign-in (and its push address), and every web portal session.
Done when: a parent who forgot their password signs in again from the app without anyone's help, and every check passes.
Commit: `feat(parents): reset a forgotten password with an emailed code`
- [x] Owner review: I checked it and said "approved"

### Step 56: One read, one tap
Plan: `docs/SCALING.md` 1.3. Due before real use at the gate. Recipe first: `docs/backend/step-56-one-read-one-tap.md`, approved 2026-10-23.
- [x] The 2-minute check and the write happen as one step per card (a short lock), so two reads of one card arriving together can't both be stored.
- [x] The gate ignores the same card read again within a few seconds, before sending it.
- [x] Tests: two reads of one card sent at the same moment give one tap and one "Already tapped".
Done when: a card held on the reader can never make a time in and a time out together, and every check passes.
Commit: `fix(gate): record one tap per card read, even when two arrive together`
- [x] Owner review: I checked it and said "approved"

### Step 57: Lost cards and alerts
Plan: `docs/SCALING.md` 1.4 and 1.5. Due before real use at the gate. Recipe first: `docs/backend/step-57-lost-cards-and-alerts.md`. Owner decided 2026-10-23: a lost card's tap doesn't count as its owner's attendance, and "handled" is a plain yes or no.
- [x] Decided with the owner: whether a lost card's tap counts as its owner's attendance. Either way, it no longer turns the owner's next real tap into a "time out".
- [x] A principal can mark a "Needs attention" alert handled.
- [x] The dashboard loads open alerts with their taps in one query.
Done when: a lost card tapped by someone else leaves its owner's day untouched, a handled alert disappears, and every check passes.
Commit: `feat(alerts): let staff resolve lost-card alerts without shifting time in`
- [x] Owner review: I checked it and said "approved"

### Step 58: The gate keeps taps while offline
Plan: `docs/SCALING.md` 1.6, from the plan's after-demo list. Due before real use at the gate. Recipe first: `docs/backend/step-58-offline-gate.md`.
- [x] A tap read while the internet is down is kept on the tablet, with the id it already gets, and sent when the connection returns. The screen says it's saved and waiting.
- [x] Photos load from the tablet's own copy when the server can't be reached at start-up.
- [x] Tests: taps made offline arrive once each, and parents are notified only after a tap reaches the server.
- Note from Step 56's architect review: time in or time out is worked out before the per-card lock, from the student's other taps. Sending a queue of old taps all at once could store two of one student's taps with the same direction. Send the queue one tap at a time, or work out the direction inside the lock. **Done:** the waiting line is sent one tap at a time, oldest first, and a tap that arrives after a later one of the same student sends no push (owner, 2026-10-23).
Done when: unplugging the network during taps loses none of them, and every check passes.
Commit: `feat(gate): keep taps while offline and send them when back`
- [x] Owner review: I checked it and said "approved"

### Step 59: Know when something breaks
Plan: `docs/SCALING.md` 1.7, from the plan's after-demo list. Due before real use. Split in three on 2026-10-23 (owner): 59 errors and uptime, 59.1 error pages, 59.2 a practice restore. Owner chose Sentry's free plan (2026-10-23). Recipe first: `docs/backend/step-59-error-tracking.md`.
- [x] Error tracking for the server and the browser, through Sentry's free plan. Its cost, and what an error report stores, checked and agreed first, since a report can include students' names.
- [ ] An uptime check on `GET /api/v1/health` that messages the owner (Sentry's included uptime monitor). Nothing to build: the owner sets it up in Sentry (`docs/ERROR-TRACKING.md`, "Setting it up"); ticked once it has emailed a "down".
- [x] A deploy with a missing setting stops before it goes live, and the old version keeps serving (`docs/PROBLEMS-LOG.md`, P-041 option 3).
Done when: a deliberate error reaches the owner within minutes, a stopped app sets off the uptime check, a deploy missing a setting is refused, and every check passes.
Commit: `chore(ops): report errors and downtime, and refuse a deploy missing a setting`
- [x] Owner review: I checked it and said "approved"

### Step 59.1: One error page, with a way to report the problem
Cut from Step 59 on 2026-10-23. Narrowed by the owner on 2026-10-25: one error page for every kind of problem, following the owner's reference design. Recipe first: `docs/backend/step-59.1-error-page.md`.
- [x] One shared error page (`ErrorScreen`) for every page a person can land on, through a root `error.tsx` and a `global-error.tsx`; the staff and parent error pages are replaced. It says what happened in plain words, shows a short reference code, and has **Try again** and **Report this problem**, which sends an optional note, the page and the code to Sentry (never a name or contact details).
- [x] A plain HTML and CSS copy of the same page, "Bantay Aral is down for a moment", for when the server isn't running, hosted free on a public R2 bucket and set with Heroku's `ERROR_PAGE_URL` and `MAINTENANCE_PAGE_URL`. A live server with a bad setting now stops (P-010's option 2), so Heroku shows it.
Done when: a deliberate error shows the page and its report reaches the owner, maintenance mode on the live site shows the "down" page, and every check passes.
Commit: `feat(errors): add one error page with a way to report the problem`
- [x] Owner review: I checked it and said "approved"

### Step 59.2: A practice restore
Cut from Step 59 on 2026-10-23. Essential-0 has no point-in-time rollback: a backup is a `pg:backups` copy, and restoring one onto the live database replaces everything. So the practice restore goes into a database on the owner's Mac.
- [ ] One practice restore of a live backup into a local database, compared with the live one, written up in `docs/DEPLOY.md` with the commands for a real restore.
Done when: the restore steps have been followed once for real, and the counts match.
Commit: `docs(ops): a tested backup restore`
- [ ] Owner review: I checked it and said "approved"

### Step 59.3: The latest tap, not just the first
Added 2026-10-26 from P-052. After 13 taps ending on a time in at 7:05 PM, the Attendance row still read "Time in 11:09 AM, Time out —", the same as a student who never moved, and the parent app showed the same. Taken out of order, beside 59.2, which waits on the owner's practice restore. Recipe: `docs/backend/step-59.3-latest-tap.md`.
- [x] The Attendance table's Time out column becomes **Latest**: from the 2nd tap on, the newest tap with its direction ("Out 4:05 PM", "Back in 7:05 PM"). Time in stays the first tap, which Late is worked out from. The phone list's second line does the same.
- [x] The parent API's `today` gains `latest: { at, kind } | null`; `timeIn`, `timeOut` and `tapCount` stay as they are, so the parent app already installed keeps working.
Done when: Katrina's row reads "11:09 AM", "Back in 7:05 PM · 13 taps", "Late", the parent API answers with `latest`, and every check passes.
Commit: `feat(attendance): show each student's latest tap beside their time in`
- [x] Owner review: I checked it and said "approved"

### Step 59.4: Record a time out by hand
Added 2026-10-27 by the owner: a student given a time in by hand (Step 55) had no way to be timed out, so their day stayed "in". **Decided 2026-10-27 (owner): no "Record back in" by hand**; recording by hand only bridges the days until a card is replaced. Recipe first: `docs/backend/step-59.4-record-time-out.md`.
- [x] `recordManualTimeOut()` (`src/services/taps/`): the same people as a time in, only while the student is in (an odd number of taps today), recorded as now. One id per student, day and tap count, and the card locked from the last tap to midnight, so two clicks or a gate read in between make one time out. A time-out notification by the school's setting.
- [x] "Record time out" in the Latest cell (under the times on a phone), on today's roll only, with a confirmation; "Recorded by staff" under a latest tap recorded by hand. One `RecordTapButton` for both.
- [x] Tests: the rules, two clicks at once against Postgres, the phone list, and the browser test continuing from Step 55's time in.
Done when: a student given a time in by hand is timed out from their row, the row reads "Out" with "Recorded by staff", no button offers a back in, and every check passes.
Commit: `feat(attendance): record a student's time out by hand from their row`
- [x] Owner review: I checked it and said "approved"

### Step 59.5: The parent home, like the app
Added 2026-10-27 by the owner: the web parent home matches the parent app's design (`talaan_parents_app/design/`), with its school illustration. Plan reviewed by the systems-architect (one round, nothing blocking). Recipe first: `docs/backend/step-59.5-parent-home.md`.
- [x] "My children" with the school illustration; each child as the app's card: photo, class, status, and a panel with the time in and the latest tap. No school name and no "Your school sends" line, as the owner trimmed the app's card the same day. The home no longer reads recent taps.
- [x] A child's day, `/parent/child/[id]`: today's taps (In, Out) and the last 10, read for that one linked child only; anyone else's child is "not found".
- [x] A parent on the web sees their own children's photos: the photo route tries the parent cookie only after the usual viewers said no, and only without an `Authorization` header.
- [x] Tests: the photo route's cases, `childToday`, the card, and the browser test from linking to the child's day.
Done when: a parent on the web sees the same card as in the app, opens a child's day, can't open another child's, and every check passes.
Commit: `feat(parents): show each child like the parent app, with a page for their day`
- [x] Owner review: I checked it and said "approved"

### Step 59.6: Pushes without the title, and status values that never change
Added 2026-10-28 from the parent app's requests 1 and 5 (`docs/PARENT-APP-REQUESTS.md`). Android already puts "Bantay Aral" at the top of every notification, so the title repeated it. Recipe first: `docs/backend/step-59.6-push-title-and-fixed-values.md`.
- [ ] No `title` on any push: `PushMessage` and `toPushMessage` lose it; the body, data, sound, channel and priority stay as they are.
- [ ] `docs/PARENT-API.md` promises that `status`, a tap's `kind` and `notificationPreference` never gain a value in `/api/v1`; Step 63 records that a no-class day will reach the app as `flexible: true`.
Done when: a push sent through Expo shows "Bantay Aral" once, then "Juan tapped in at 7:56 AM", and every check passes.
Commit: `feat(push): send pushes without a title, and fix the parent API's status values`
- [ ] Owner review: I checked it and said "approved"

### Step 59.7: The notification list shows today, and opening it clears the badge
Added 2026-10-28 from the parent app's request 2 and an owner decision (`docs/PARENT-APP-REQUESTS.md`). Replaces request 4 (filters), which was dropped. Recipe first.
- [ ] The list and the unread count are today's taps on the school's clock, plus every new-guardian notice still unread, whatever its day.
- [ ] A per-parent "seen" time, set by `POST /api/v1/parents/notifications/seen`; the badge counts notifications newer than it and still unread. `read` stays shared by a child's guardians.
- [ ] The web parent portal's bell and list do the same.
Done when: opening the bell clears the badge for that parent only, every notification stays marked unread until opened, yesterday's taps are gone from the list, an unread link notice from last week is still there, and every check passes.
Commit: `feat(notifications): show today's notifications, and clear the badge when the list is opened`
- [ ] Owner review: I checked it and said "approved"

### Step 59.8: A parent reports a link they don't know
Added 2026-10-28 in place of the parent app's request 3 (school contact details), which the owner dropped: nobody at a school would answer, and the super admin is the one who removes a wrong link (Step 55.4). See `docs/PARENT-APP-REQUESTS.md`. Recipe first.
- [ ] `POST /api/v1/parents/notifications/:id/report`: only on a new-guardian notice the parent received, once per notice (a second report changes nothing). The notice keeps when it was reported, in one new column.
- [ ] An email to the address in a new `REPORTS_EMAIL` setting, through the daily email limit: the school's name and a link to its parent accounts page, never a child's or parent's name.
- [ ] The notice's advice becomes "If you don't know them, tap Report and we'll look into it.", with a Report button; once reported it reads "Reported. We'll check this link." The same on the web parent portal. The notice's JSON gains `reportedAt`.
- [ ] The removed parent's message (`link_blocked`) loses "Contact your child's school.": "This child can't be linked to your account."
Done when: a parent reports a link notice, the owner gets an email with no names, a second report sends nothing, and every check passes.
Commit: `feat(parents): let a parent report a link they don't know`
- [ ] Owner review: I checked it and said "approved"

### Step 60: Privacy for real student data
Plan: `docs/SCALING.md` 1.8, from the plan's after-demo list. Due before real use. Likely to be split once its recipe is written.
- [ ] A privacy notice parents see, and a record of each parent's consent. The wording comes from the school.
- [ ] Export and delete one student's data, and a whole school's.
- [ ] A parent can delete their own account from the app. Google Play and Apple's App Store both require this before an app that makes accounts can be published (`docs/PARENT-APP-BRIEF.md`).
- [ ] An audit log: who added, changed or removed students, cards and staff, and when.
Done when: a school can answer "what do you keep about my child, and can you delete it?", and every check passes.
Commit: `feat(privacy): add consent, data export and deletion, and an audit log`
- [ ] Owner review: I checked it and said "approved"

### Step 61: Queries that don't grow
Plan: `docs/SCALING.md` 3.1–3.3. Due before a second school. Reviewed with the systems-architect on 2026-10-16 (two rounds, no blocking concerns). The roster item (3.4) moved to Step 61.1 so each half fits one review.
- [ ] Time in or time out is worked out from the student's taps that day only: a new `listByStudentOnDate`, used by `recordTap` and `notifyParentsForTap` instead of the student's whole history. Tests include taps one millisecond either side of the school's midnight.
- [ ] Migration `card_school_serial` adds an index on `Card` by `(schoolId, serial text_pattern_ops)`, the kind Postgres can use for "starts with" under the database's `en_US` collation, so matching a card and building the roster read only that school's cards.
- [ ] The database pool's size is set on purpose: `DATABASE_POOL_SIZE` (8 when unset; a bad value stops the server starting), and a 5-second wait for a free connection instead of waiting forever. The connection budget for Essential-0's 20 is written in `docs/DEPLOY.md`.
Done when: each of these reads the same number of rows in a school's fifth year as in its first, shown with `EXPLAIN (ANALYZE, BUFFERS)`, and every check passes.
Commit: `perf(taps): keep tap queries fast as schools and years grow`
- [ ] Owner review: I checked it and said "approved"

### Step 61.1: The roster answers "nothing changed" cheaply
Plan: `docs/SCALING.md` 3.4. Split from Step 61 on 2026-10-16.
- [ ] `Card.updatedAt`, with a default so the migration works on a table that already has rows.
- [ ] A cheap stamp of the school's students and cards (how many, the newest change, and the sum of change times, so a late-saved change is never missed), plus a format number bumped whenever the roster's shape changes in code. The gate's "anything new?" is answered from the stamp before any list is loaded.
- [ ] The stamp is read before the lists, never after, and its totals stay text, never a JavaScript number. Both are tested.
Done when: an unchanged roster answers 304 without loading any student or card, any edit to a student, card or photo changes the answer, and every check passes.
Commit: `perf(gate): answer an unchanged roster without rebuilding it`
- [ ] Owner review: I checked it and said "approved"

### Step 62: Pages ask the database once
Plan: `docs/SCALING.md` 3.5. Due before a second school.
- [ ] Students: search, filters, sort, the page and the total are done by the database, with each student's cards in the same query.
- [ ] Attendance, the teacher's dashboard and the station page load the class's (or school's) cards in one query.
- [ ] Schools: student and staff counts come from counting, not from loading every row.
- [ ] A test that fails if the Students page makes more than a few queries.
Done when: no page makes one query per student, and every check passes.
Commit: `perf(pages): load each list with one query, not one per student`
- [ ] Owner review: I checked it and said "approved"

### Step 63: School calendar
Plan: `docs/SCALING.md` 4.1. Due before the next rainy season (around June 2027).
- [ ] A school can mark holidays and class suspensions. Those days show "No class", never absent.
- [ ] Decided in the recipe: schools with Saturday classes.
- [ ] The parent API keeps its four status values (Step 59.6): a no-class day reaches the app as `flexible: true` plus a new optional field saying why, so an installed app shows "No tap" or "Came in". The words that say "weekend" outright are reworded: the attendance page's "Weekend: no late or absent times." (`attendance-hero.tsx`) and `docs/PARENT-API.md`'s `flexible` lines.
Done when: a suspended day shows nobody absent, and every check passes.
Commit: `feat(attendance): add holidays and class suspensions`
- [ ] Owner review: I checked it and said "approved"

### Step 63.1: A child's attendance history for the parent app
Added 2026-10-28 for the parent app's future attendance tab (`docs/PARENT-APP-REQUESTS.md`). After Step 63, so a holiday never shows as absent. Recipe first.
- [ ] `GET /api/v1/parents/children/:id/attendance?from=&to=`, about a month at most: each day's status, time in, latest tap and tap count, from one query.
- [ ] Days before the student was added aren't shown as absent; the recipe decides how they appear.
Done when: a month of history takes one request, a holiday reads "No class", and every check passes.
Commit: `feat(parents): add a child's attendance history to the parent API`
- [ ] Owner review: I checked it and said "approved"

### Step 64: School years
Plan: `docs/SCALING.md` 4.2. Due before the next school year starts (around June 2027).
- [ ] A student can be marked graduated, transferred or dropped. They leave rosters and counts, and keep their history.
- [ ] Starting a new school year (new grades and sections) keeps last year's attendance under last year's class. The recipe weighs an enrollment per year against keeping the grade and section on each tap.
Done when: after a test promotion, last year's class attendance still lists last year's class, and every check passes.
Commit: `feat(students): add school years, promotions and inactive students`
- [ ] Owner review: I checked it and said "approved"

### When needed (no step number until it's due)
Each has a trigger in `docs/SCALING.md` section 5. When one happens, it becomes the next numbered step.
- More than one server: Standard dynos, the live monitor feed through Postgres `LISTEN/NOTIFY`, sign-in limits in a table, a connection pooler.
- Database storage: how many years of taps and notifications to keep, archiving older ones, the next database plan.
- Postgres row-level security, when a second real school joins (`docs/SCHOOL-ISOLATION.md`).
- Servers closer to the Philippines, if pages feel slow or a school asks where the data is kept.
- Web Push in the browser, gate online/offline on the dashboard, an admin screen for devices.
- **Proposed: the gate page opens with no internet at all (would be Step 58.1).** After a power cut or a browser restart during an outage, the tablet shows the browser's own "no internet" page instead of `/gate`, since the page itself has to come from the server. A service worker (a small script the browser keeps) would serve a saved copy. Its risk: an old copy of the page staying after a deploy. Not written yet; Step 58 covers the internet dropping while the page is open.
- **Optional, when there's time: a found card back in use (would be Step 57.1).** Decided 2026-10-23: for now a lost card stays lost and can't be turned back on. The recipe is written and waiting: `docs/backend/step-57.1-card-found.md`. It only ever helps before a new card is issued.

## Phase 3: parent app (starts after Step 53, in its own repository)
**Where Talaan pauses (decided 2026-10-13):** once Step 53 is approved and live on Heroku, the parent app takes over, in its own repository. Its setup step (M1) can start earlier, any time. The starter kit in `mobile/` (since 2026-10-19; before that `docs/PARENT-APP-BRIEF.md`) is everything it needs to begin: what Talaan is, the parent API, the design rules, its own step plan (M1–M8) and the working rules, copied into the new repository as they are, so nothing has to be explained again. Heroku runs Talaan through Step 54.1 (deployed by the owner, 2026-10-19), so the app develops against the live server (`mobile/starter/docs/SERVER.md`). Talaan's Step 54 (push) is finished alongside the app. The demo is Steps 52–54 here plus the app's M1–M8. Steps 55–64 follow the demo.

- A separate Expo (React Native) app for parents — iOS and Android from one codebase — talking to the same `/api/v1` API as the gate station and admin web, authenticated the same token-based way. Decided 2026-10-03, replacing the earlier Capacitor-wrapping plan — see "Plan history" above and `docs/ARCHITECTURE.md`.
- Deliberately small and parent-only: sign up or sign in, link a child (LRN + last name + birth date), receive tap notifications, and view the notification feed and the linked child's taps. No staff, gate or admin features, ever — those stay in the web app.
- Push through Firebase Cloud Messaging, so notifications arrive as real OS-level push even with the app closed.
- The web app keeps working as-is: for staff always, for the gate station and monitor always, and for any parent who hasn't installed the app.
