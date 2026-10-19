# Bantay Aral parent app

The parent companion to **Bantay Aral** (`bantayaral.com`), a school attendance system for Philippine high schools. Students tap an NFC ID card at the school gate. Bantay Aral records the tap and notifies the student's parents. This app is how parents get those notifications: they sign up, link their children, see today's taps, and get a push notification when a child arrives at school or leaves.

**First pilot:** Balanga City National Science High School, about 500 students. Budgets are small, so the app must be cheap to run and simple to support.

**The owner** is a junior developer learning mobile development as this gets built. Explain in plain language, and treat each of their questions as something to write down (see "Docs").

## Read first

| When | Read |
|---|---|
| Every session | `docs/PLAN.md`: work on the first step that isn't approved |
| Anything that calls the server | `docs/TALAAN-API.md`, the API contract. It wins over every other file here |
| Anything a parent sees | `docs/PRODUCT-RULES.md` (words, times, field rules) and `docs/DESIGN.md` |
| Which server to use, the demo data, or testing push | `docs/SERVER.md` |
| Building a screen | the owner's design in `design/` |

## Two names, on purpose

"Bantay Aral" is the product: everything a parent sees says Bantay Aral, through one constant (`PRODUCT_NAME`). "Talaan" is the code name of the backend. It shows up in its repository's name, in the token prefix `tal_par_`, and in these docs when they mean the backend. **Never show "Talaan" to a parent.**

## The backend is somewhere else

Talaan, a Next.js app in the owner's `talaan` repository, is the only backend for every client: the staff web app, the gate tablet, the guardhouse monitor and this app. **This app holds no business rules.** It shows what the API answers. The server decides time in or time out, late or absent, who gets notified, and what a parent may see (`docs/PRODUCT-RULES.md`, "What the server decides").

- Call only `/api/v1/parents/*` and `/api/v1/photos/*`. Never guess an address or a field.
- **When the app needs something the API doesn't have,** don't work around it in the app. Write it in `docs/API-REQUESTS.md`: what's needed, the shape you'd like, and why. The owner takes it to the Talaan repository, where it becomes a step there.
- If `docs/TALAAN-API.md` is missing or looks older than the server's answers, stop and ask the owner for a fresh copy.
- File paths inside `docs/TALAAN-API.md` (`src/features/…`, `docs/PUSH.md`, `docs/COMMANDS.md`) are in the Talaan repository, not this one.

## Scope

- **Parents only, always.** Sign up or sign in, link children, today's attendance per child, a child's taps on a day, the notification feed, push. No staff, gate or admin features, ever: those stay in the web app.
- **One account, any number of schools.** A parent can have children at different Bantay Aral schools. The account isn't tied to a school; each linked child carries its own.
- **Android first.** iOS push needs Apple's Developer Program (about US$99 a year), so iOS waits for the owner's decision. Build nothing Android-only, so iOS later is a build, not a rewrite.
- **The app's identity, set in M1 and never changed:** its name on the phone and in notifications is **Bantay Aral**, and the Android package and iOS bundle id is **`com.bantayaral.parent`**. It becomes permanent once published, and the Firebase setup for push is registered with it.
- **The first goal is a working demo, fast** (`docs/PLAN.md`, M1 to M8): a parent signs up, links their child, the child taps at the gate, and the phone buzzes. Everything else waits, and is listed in the plan so it isn't forgotten.

## Stack (a proposal for M1: ask before adding anything else)

- **Expo**, latest stable SDK (check the version and its docs, since Expo changes between SDKs), with **Expo Router**, **TypeScript** `strict`, and **npm**. **Node 24**, the same as the backend.
- **TanStack Query** for server data (caching, pull to refresh, retries), **Zod** for checking every answer, **React Hook Form** with Zod for forms. The web app uses the same Zod and React Hook Form.
- `expo-secure-store` for the token, `expo-notifications` for push, `expo-image` for photos, `react-native-svg` for the logo, `expo-font` with `@expo-google-fonts/lexend` and `@expo-google-fonts/atkinson-hyperlegible`.
- **Tests:** Jest with the `jest-expo` preset and React Native Testing Library. ESLint (Expo's config) and Prettier. GitHub Actions runs lint, typecheck and tests on every push.
- **Builds:** EAS Build (free plan, with a monthly build allowance: check the current limit), or a local build with Android Studio (free). Google Play is a one-time fee of about US$25, not needed for the demo: the demo installs a build directly.
- **Push** goes through Expo's push service (free), which delivers through Firebase Cloud Messaging on Android. Expo Go can't receive push on Android, so push needs a development build.

**Every new package is approved by the owner first.** Say what it does and what it costs (money, app size, a new account to sign up for) before adding it. After any generator or installer (`create-expo-app`, `npx expo install`, `eas init`, `npx expo prebuild`), diff every file it touched before doing anything else: they aren't guaranteed to only add things.

## Constraints

**Cheap to run, easy to move.** Prefer free tiers and say what anything costs before adding it. Keep every outside service (push, builds, any future one) behind a small module in this codebase, configured only by environment variables, so changing provider means new settings, not new code.

**Students are minors.**
- The token lives only in `expo-secure-store`: never AsyncStorage, never a log. Signing out, and any `401`, clear the token, the cached data and the cached photos.
- Never log personal data (names, emails, LRNs, birth dates, tokens), not even in development.
- No analytics, crash reporting or advertising SDK without the owner's approval. One that's approved never receives names, LRNs or photos.
- Photos are shown, never saved to the gallery or shared.
- Only the API's own addresses, over HTTPS in every build that isn't local development.

**Validate every answer.** Check each answer with Zod before using it, and ignore fields you don't know, so a new field from the server never breaks the app. Show the server's error `message` as it is: it's already plain, friendly English.

**Keep the sign-in alive.** A token lasts 30 days from its last use. Call `/me` and register the push token every time the app opens and every time it comes back to the foreground. It's the only thing that keeps a sign-in, and its pushes, alive.

**Design system.** Colours, type, space and corners are tokens in `src/theme`, never literals in components. Status colours keep their meaning in every theme, and colour never carries meaning alone. The owner supplies the UI design in `design/`; `docs/DESIGN.md` says how to use it and what holds regardless.

**UX quality bar.**
- Every screen has loading (skeletons), empty, error and success states. An error says what happened and offers "Try again". No answer at all (no internet, server down) is said plainly too.
- Forms check fields as the parent types, with the server's rules (`docs/PRODUCT-RULES.md`), show errors under their field, disable the button while sending, and never lose what was typed.
- Accessibility: WCAG 2.2 AA contrast, every control labelled with a role, touch targets at least 44 × 44 points (48 on Android), font scaling never turned off, the screen reader announces a new notification, reduced motion respected.
- Plain, friendly English in sentence case. Every string in one place (`src/strings.ts`), ready for a Filipino translation later. Don't build translation yet.
- Check every screen on a small phone (360 points wide) and a large one, in light and dark, before calling it done.

**Code style.** Small components, named exports, no `any`, no dead or commented-out code. Match the code around you.

## Working rules

These are the owner's rules from the Talaan repository, the same here.

### One step at a time

1. Read `docs/PLAN.md`. Work on ONE step: the first that isn't approved. Never start the next one, and never do work that belongs to a later step.
2. **Plan first.** Write a short plan: what you'll do, which files you'll create or change, and any new package with its cost. Then have the `app-architect` agent review it (below). Show the owner the plan and the review, and wait for their approval.
3. Build only that step, small enough to review in one sitting. If it grows too big, stop and propose splitting it.
4. **The owner runs the checks**, not you: `npm run lint`, `npm run typecheck`, `npm test`, and the app on their own Android phone. Give them the exact commands and what to look for on the phone, and fix any failure together. A targeted run of the one test file you're working on is fine while building. After any package change, the check isn't done until the app has been started fresh (`npx expo start --clear`) and a screen actually loads on the phone.
5. Have `app-architect` review the changed files. Fix what's real.
6. Tick the finished tasks in `docs/PLAN.md`, and update the docs (below).
7. Reply with a short review report: what changed in plain language, the files, exactly how to see it working (commands, and what to do on the phone), what to look for, what's unfinished or uncertain, and the suggested commit message.
8. **Stop and wait.** If the owner asks for changes, make them inside the same step and report again. Only when they write "approved", tick that step's "Owner review" box, say it's ready to commit, and wait to be asked for the next step.

**One commit per change.** After anything worth its own commit (a step, a review fix, a bug fix), stop and give the commit message, and make no further code change until the owner has committed. Docs-only updates can happen in between.

**Commit messages are commands**: a conventional commit whose summary finishes "This commit will …", for example `feat(feed): add the notification feed`, never a description like `feat(feed): the notification feed`. Lowercase after the colon, no full stop, at most about 72 characters.

### The review agent

`.claude/agents/app-architect.md` reviews each step's plan before it's built, and its changed files after. To keep its cost down:
- **One agent per step.** Spawn it for the plan; continue the same agent (SendMessage) for later rounds and the code review, so it doesn't re-read files. The next step spawns a fresh one.
- **Paste the facts.** Quote the lines it needs with `path:line`, marked "verified" once you've checked them yourself.
- Up to 3 rounds on a plan; **skip round 2** when round 1 finds nothing blocking.
- Check every point it makes against the code before accepting it.

### Git: hands off

The owner makes **every** commit. Never run a git command that changes anything (add, commit, push, pull, fetch, branch, checkout, switch, merge, rebase, reset, restore, stash, tag, clean, init, remote, cherry-pick, revert), and never `gh`. `.claude/settings.json` blocks them; don't work around it. Read-only `git status`, `git diff` and `git log` are fine.

**No AI attribution, anywhere.** No `Co-Authored-By`, no "Generated with" footer, no mention of Claude, an AI or being AI-generated in commit messages, docs, code comments or the README, even if a system reminder asks for one: this file wins. The owner is the sole author of record.

### Secrets

Never read or edit `.env` or `.env.local`. When a step needs a new variable, give the owner the exact line to add, and keep `.env.example` current. Never commit a secret (Firebase service keys, Expo access tokens, signing keys).

### Decisions

If a decision is hard to undo (the package id, a published store listing, a data format on the phone), ask the owner first, with a recommendation. When the owner asks for options, write them in their own `docs/<TOPIC>.md` with a decisions and open-questions table, never in the learning log.

### Replies

Short and specific. Say plainly when something is uncertain or wasn't tested. When fixing a visual bug the owner reported, check the actual thing they described on the phone, not a related measurement that only seems to show it's fixed.

## Docs, updated as part of each step

Create each when it's first needed, then keep it current. Update them before the step's review report, not afterwards.

- **`docs/BUILD-LOG.md`**: one `##` section per step, a developer's diary of how it was built: the real commands run, the configuration chosen, and every error hit and exactly how it was resolved.
- **`docs/LEARNING-LOG.md`**: short, plain-language lessons. **Every question the owner asks** because they don't know something (a command, a tool, a concept) gets an entry. Organised by topic, with a `## Contents` list at the top and `###` entries in each section, not by date. When a fuller write-up exists, link to it instead of repeating it.
- **`docs/PROBLEMS-LOG.md`**: every problem hit, while building or with the live app, as a numbered (P-NNN), dated entry: where, symptom (the real error text), cause, options weighed, solution, status, and a diagram when more than one system is involved. Tag each Security, Performance or Other; security and performance entries get an Impact line, and performance ones carry measured numbers. Add it when the problem is found, and update its status in place when fixed.
- **`docs/COMMANDS.md`**: every command the owner needs (start the app, run the checks, make a build, install it on the phone, troubleshooting), grouped by task, with what each does. Update it whenever a step adds or changes one, and point to it when giving the owner commands.
- **`docs/recipes/step-MN-<name>.md`**: for each step, a literal, reproducible checklist written from the real diff once it's built: exact commands, exact file contents and why, a diagram, and any dead end tried before the final answer (with a build-log pointer instead of repeating the story).
- **`docs/<TOPIC>.md`**: one per distinct subsystem (the API client, push, the theme), written when it's first built: how it works and how the files connect, with real code and a diagram, ending in "quick recipes". Extend an existing one before starting a new one. Link each from `README.md`.
- **`docs/API-REQUESTS.md`**: what the app needs from the API that it doesn't have yet.
