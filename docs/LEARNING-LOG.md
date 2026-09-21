# Learning log

Short, plain-language notes explaining things along the way — for whenever I want a reminder later. Grouped by topic, not by date, so a whole subject can be found in one place. Within each topic, newest entries are at the bottom. If a topic has a fuller write-up elsewhere (an interactive page, a longer doc), the entry here stays short and links out instead of repeating it.

## Contents
- [Command line & Git basics](#command-line--git-basics)
- [Keeping local and CI in sync](#keeping-local-and-ci-in-sync)
- [Colors and theming](#colors-and-theming)
- [Components and libraries (shadcn/ui)](#components-and-libraries-shadcnui)
- [Next.js as a full-stack framework](#nextjs-as-a-full-stack-framework)
- [Domain modeling: types vs. schemas](#domain-modeling-types-vs-schemas)
- [Tap stations and notifications (Phase 2 planning)](#tap-stations-and-notifications-phase-2-planning)
- [App shell and navigation (Step 10)](#app-shell-and-navigation-step-10)

---

## Command line & Git basics

### Moving files in Bash (`mv`)
`mv <source> <destination>` moves or renames a file/folder. `./` as the destination means "the current folder."

To move only *some* files out of a folder (and skip others), list each one by name instead of using a wildcard:
```bash
mv tempo/talaan/package.json ./
mv tempo/talaan/src ./
```
A wildcard (`mv tempo/talaan/* ./`) moves *everything*, which is risky if you need to skip a few files — like the generated `CLAUDE.md` we didn't want to overwrite, or `node_modules`, which is better reinstalled fresh. Also, `*` alone doesn't match dotfiles (like `.gitignore`) — that needs a separate pattern: `.[!.]* `.

Delete a folder (and everything in it) with `rm -rf <folder>`: `-r` = recursive (include subfolders), `-f` = don't ask for confirmation.

### Saving and quitting in vi/vim
Some git commands (like `git commit` typed without `-m "message"`) open a text editor for you to type the commit message — on many systems that's vi/vim, which doesn't work like a normal text editor.

To save and exit: press `Esc` first (makes sure you're not still "typing"), then type `:wq` and press Enter. `:q!` instead quits without saving, if you want to back out. This project shouldn't need it though — VS Code's Source Control panel handles commit messages without ever opening vi.

### The "LF will be replaced by CRLF" warning, and `.gitattributes`
This is a Git thing, unrelated to `npm run build` or Next.js. Every text file has invisible line-ending characters: Linux/Mac tools (and virtually all coding tools, Claude included) write **LF**; Windows traditionally uses **CRLF** (one extra character per line). Windows Git has a setting, `core.autocrlf`, that's commonly on by default — it quietly converts between the two whenever files are added or checked out.

This warning was probably always happening, just invisible: committing through VS Code's Source Control panel runs the same Git commands under the hood, but doesn't show you their raw warning text. Once a commit was made directly in a terminal (`git commit`), Git's own output — warnings included — became visible for the first time.

Fixed with a `.gitattributes` file containing one line: `* text=auto eol=lf`. This tells Git explicitly "always use LF for text files," so there's no more mismatch to warn about, no matter whether the commit comes from the terminal or VS Code's panel.

### Reviewing an old step's code without interrupting current work: `git worktree`
Asked how to inspect an earlier step's actual running code (not just its diff) while Claude keeps building the next step, without the two interfering with each other in the same folder.

Two different tools for two different needs:
- **Just reading what changed** — plain, read-only commands, safe to run any time no matter what's happening in the working folder: `git log --oneline` (list every step's commit), `git show <hash>` (full diff of one commit), `git diff <hash>~1 <hash>` (same, as an explicit range). These never touch any files, so there's no risk of colliding with in-progress work.
- **Actually running an old step** (clicking through the app as it looked at that commit) — a **git worktree**: a *second* folder, checked out to an old commit, sharing the same repository history but completely separate from the main folder's files. Set up once with:
  ```bash
  git worktree add ../talaan-review <hash>
  ```
  then `npm install && npm run dev` inside that second folder. No stashing, no switching branches, no touching the main folder at all — both can be open and running at the same time.

Considered and set aside: a separate git branch (or PR) per step. It would mean creating, pushing, reviewing and merging a branch for every one of the plan's 24 steps — all by hand, since Claude can't run any git command that changes state (`.claude/settings.json` blocks it). For a solo, strictly sequential build where each step already needs an explicit "approved" before the next one starts, that ceremony doesn't add real safety over plain commits on `main` plus a worktree for hands-on study.

**Not set up yet** — noted as something to do later; this entry is the reference for when that happens.

### Adding the shadcn MCP server
An "MCP server" is a small tool that Claude Code can talk to for extra abilities — here, letting Claude browse and add shadcn/ui components directly instead of guessing at their code.

Command used: `npx shadcn@latest mcp init --client claude`. This asked the shadcn CLI to set itself up as an MCP server for Claude specifically (other options exist for cursor, vscode, etc.).

It created `.mcp.json` in the repo root — a project-scoped config so anyone working on this repo gets the same MCP server, without each person setting it up by hand:

```json
{
  "mcpServers": {
    "shadcn": { "command": "npx", "args": ["shadcn@latest", "mcp"] }
  }
}
```

It also added `shadcn` as a devDependency in `package.json` (the CLI package itself).

MCP servers only load when a Claude Code session *starts* — so after adding one, you need to close and reopen the session (or start a new one) before Claude can actually use it.

---

## Keeping local and CI in sync

### Why a check can pass for Claude but fail in CI
This happened with `npm run typecheck`: it passed here, then failed as soon as it ran in GitHub Actions. The reason wasn't the workflow file — it was that Next.js generates some special files (type definitions, in a hidden `.next` folder) the first time you run `npm run dev` or `npm run build`. Locally, that folder already existed from earlier work, so the check quietly relied on it without anyone asking it to. GitHub Actions always starts from a completely empty, fresh copy of the repo — no `.next` folder, no leftovers — so anything that secretly depended on "stuff left over from before" gets exposed immediately.

This is actually the whole point of CI: it catches "works on my machine" bugs, because it never has "my machine's" leftover state to lean on. The fix was to make the `typecheck` script generate those files itself first (`next typegen`) instead of assuming they're already there.

### Keeping local and CI on identical versions, so "it works here" always means "it works there"
Two separate real bugs one week both boiled down to the same root cause: something was a different version locally than in CI. Worth understanding both halves, since together they're the whole story of "local = CI":

**1. Node.js itself.** A dependency (`jsdom`) broke in CI but not locally, purely because CI was pinned to Node 20 while this machine runs Node 24 — the dependency only worked on Node 22+. Fix: instead of asking anyone to switch Node versions before every push, `.github/workflows/ci.yml`'s `node-version` and CLAUDE.md's stated minimum were both moved to Node 24, matching what's actually installed here. If this machine's Node version is ever upgraded to a new major later, update both of those in the same commit, for the same reason — otherwise this exact problem comes back.

**2. Package versions — this is what `package-lock.json` and `npm ci` are actually for.** `package.json` lists version *ranges* (like `"vitest": "^4.1.11"`, meaning "4.1.11 or any later 4.x"). Two different installs on two different days could legitimately resolve different exact versions from the same `package.json`. `package-lock.json` freezes the *exact* version of every package (direct and indirect) that was actually installed, so everyone — and every machine — gets identically the same dependency tree. That's why `npm ci` (used in `.github/workflows/ci.yml`) matters instead of `npm install`: `npm ci` refuses to resolve anything new and installs *exactly* what the lockfile says, deleting `node_modules` first to guarantee a clean match. `npm install` is fine for everyday local work (adding a package, letting patch versions drift a little), but before trusting a "it passes locally" result, the most faithful local check is the same one CI does:
```bash
rm -rf node_modules .next
npm ci
npm run lint && npm run typecheck && npm run test && npm run build
```
Committing `package-lock.json` every time it changes (already happening automatically with `npm install`) is what makes this guarantee real — if it's ever out of sync with `package.json`, `npm ci` fails loudly rather than silently installing something different than what CI will get.

---

## Colors and theming

### Why colors are stored as OKLCH instead of hex
Hex codes (`#223060`) don't have a "how bright does this look to a human eye" number built in — the closest thing, HSL's "lightness," actually lies: a blue and a yellow at the "same" HSL lightness can look very different in brightness. OKLCH's lightness number doesn't lie that way, which matters here specifically because this app needs to *compute* things about colors, not just display them — "is this readable enough" (WCAG contrast) and "build a whole palette from one brand color" (a later step's "Custom" theme picker) are both simple, reliable operations in OKLCH and unreliable ones in hex/RGB. You can still hand over a color as a familiar hex code any time (like CLAUDE.md's own `#223060`) — it just gets converted to OKLCH once, the same way it already was for the very first theme back in Step 4.

### A rounded number can "escape" a boundary that was just enforced
While building Step 5's theme presets, a color would sometimes fail an automated check even though it had just been mathematically corrected to be safe. The cause: the correction (clamping a color to fit what a screen can display) was computed first, and *then* the result got rounded off for a tidy, readable number — but rounding a value that's sitting exactly on a boundary can push it slightly back across that boundary. The fix was to do the steps in the right order: round first, then compute the correction *against the already-rounded number*, so nothing rounds again afterward to undo it. A useful general instinct: whenever a value gets "fixed to be within some limit" and then displayed with fewer digits, check whether the display step could quietly break the fix.

### The three-layer color override, and why commenting one out changed nothing
Asked after testing this directly: commenting out `<ThemePresetStyle />` in `layout.tsx` visibly changed nothing. The short version — three separate, independent things decide what color actually shows:
1. **`tokens.css`** — a baseline, always loaded, always there.
2. **`ThemePresetStyle`** — an *optional* extra `<style>` tag stacked on top, which only wins if it says something different from the baseline (it uses a doubled selector, `:root:root`/`.dark.dark`, specifically so it always wins *when present*).
3. **`ThemeProvider`** (next-themes, the light/dark toggle) — a completely separate thing that never sets a color itself; it only flips which half (light or dark) of whichever CSS is currently loaded applies.

Removing `ThemePresetStyle` changed nothing because its only configured preset (`school`) says the *exact same colors* as the baseline underneath it — like taking off a transparent overlay that was drawn in the same color as the page beneath it.

**Full visual, interactive version:** [Talaan Theme Layers](https://claude.ai/artifact/HWXYY2M2GwdxXAkY9djNwy) — lets you flip each of the three switches yourself and watch the effect live, plus a diagram of how the actual files connect and why `:root:root` beats `:root`. Also written up in [`docs/STYLING-SYSTEM.md`](STYLING-SYSTEM.md).

### Why Step 4 and Step 5 were separate steps instead of building presets from the start
Short version: Step 4 had to prove the token *mechanism* worked (using one already-designed, already-verified palette) before Step 5 could safely add four more palettes *and* the automatic checking system needed to trust them. Building both at once would have made a rendering bug and a bad color choice indistinguishable from each other.

**Full explanation:** the "Why this was two separate steps, not one" section in [`docs/STYLING-SYSTEM.md`](STYLING-SYSTEM.md#step-5-theme-presets-and-the-contrast-helper).

### Are we still using Tailwind, or did we replace it with plain CSS variables?
Still 100% using Tailwind — nothing was overridden or bypassed. What changed is *what a class points to*, not *how classes work*.

A normal Tailwind project writes:
```css
@theme {
  --color-blue-500: #3b82f6;
}
```
— which bakes a fixed color into the generated class: `.bg-blue-500 { background-color: #3b82f6; }`.

This project's `globals.css` instead writes:
```css
@theme inline {
  --color-primary: var(--primary);
}
```
Same mechanism, same result (a real `.bg-primary` class still gets generated) — but `inline` tells Tailwind "point this at a *live* variable, don't bake in a fixed value." So `bg-primary` always resolves to whatever `--primary` currently is (which theme, which color mode), instead of one frozen color.

**Using it day to day is unchanged:** write ordinary Tailwind classes in a component (`className="bg-card border border-border rounded-lg p-4"`) — no special syntax. The only real difference from a fresh Tailwind project: you can't reach for the built-in palette (`bg-blue-500`, `text-emerald-600`) — only names actually declared in `tokens.css` and mapped in this `@theme inline` block work, which is what makes "no hardcoded colors" possible to enforce at all. To add a brand-new one, see the "Quick recipes" section at the bottom of [`docs/STYLING-SYSTEM.md`](STYLING-SYSTEM.md).

### What `check:tokens` (Step 7) is actually looking for
Asked what a "raw color literal" is and why the script needs to scan the codebase for one. Short version: a **literal** is an actual color value typed straight into the code — a hex code (`#223060`), or `rgb(...)`/`hsl(...)`/`oklch(...)` with real numbers in it. That's the opposite of a **token name** like `bg-primary`, which doesn't name a color at all — it names "whatever the current theme's primary color is," which is what lets a whole theme swap happen with zero component changes (see the entry above).

Nothing in the language stops someone from typing a literal color into a component by habit — `className="bg-[#223060]"` would look completely fine today (it happens to match the current default theme) but would leave that one element permanently stuck at that color in every other preset and in dark mode, while everything around it correctly changes. `check:tokens` is a plain search over `src/` (not the `design/` prototype folder, which is *supposed* to be full of hardcoded colors) for exactly those patterns, plus Tailwind's own built-in color names (`bg-blue-500`, `text-emerald-600`, etc., which the project isn't supposed to use — see the entry above). It fails loudly if it finds one, the same way a lint error would. Only `tokens.css`, `presets.ts`, and the small theme-math helper files are allowed to contain real color values — that's where "primary = this exact blue" is supposed to be defined exactly once.

---

## Components and libraries (shadcn/ui)

### What "shadcn/ui" actually is: copied code, not an installed black box
Most npm packages get installed into `node_modules` and stay there, invisible, forever. shadcn/ui works differently on purpose: its CLI *copies* each component's actual source file straight into this repo (`src/components/ui/button.tsx` is a real file here, not buried in `node_modules`), so it can be opened, read, and edited like any other project file. That's why it was safe to plug directly into this project's own colors instead of bringing its own — it's designed to be adjusted per project, not used as a sealed unit.

**Full write-up, including the Radix/Base/React Aria engine decision and how a component's classes resolve to our tokens:** [`docs/COMPONENTS.md`](COMPONENTS.md).

### A scaffolding tool can rewrite files it didn't create
Running `npx shadcn@latest init` on this already-styled project didn't just add new things — it also appended its own generic color values and font choices into files (`globals.css`, `layout.tsx`) that Steps 4 and 5 had already carefully set up, in a way that would have silently taken over (CSS lets a later rule quietly replace an earlier one with the same name). The fix wasn't complicated — checking `git diff` right after running the command, before doing anything else, made every unwanted change obvious and easy to undo by hand. The lesson: any tool that offers to "set up" or "scaffold" something in an existing project should be assumed to touch more than it advertises, until a diff proves otherwise.

### What do class-variance-authority, lucide-react, sonner, cn, and tw-animate-css actually do?
Five small packages arrived with Step 6's components. None of them are about color — that's still entirely `tokens.css`/`presets.ts`'s job. Each does one narrow thing:

| Package | What it does | Where to see it |
|---|---|---|
| **`class-variance-authority`** (cva) | Turns a component's variants (Button's "default" / "outline" / "destructive" / …) into one declarative list instead of scattered if/else logic. Call it with `{variant: "outline"}`, get back the exact right class string. | Top of `src/components/ui/button.tsx` — the `buttonVariants = cva(...)` block |
| **`lucide-react`** | An icon library: hundreds of ready-made icons as React components. Already named in CLAUDE.md's own stack list — just not an installed package until a component needed one. | The **✕** in a dialog's close button, the chevron in a select box |
| **`sonner`** | The real toast-popup engine — shows, animates, and auto-dismisses a small notification. `src/components/ui/sonner.tsx` is only shadcn's wrapper connecting it to our colors; also already in CLAUDE.md's stack. | Click "Show a toast" on the demo page |
| **`cn`** | One tiny function: safely merges several Tailwind class strings into one, so a later class correctly overrides an earlier one instead of both applying and fighting. | `className={cn(buttonVariants({...}), className)}` — nearly every `ui/` file |
| **`tw-animate-css`** | Ready-made animation classes (`fade-in-0`, `zoom-in-95`, `slide-in-from-top-2`) that dialogs/menus/selects use so they animate open/closed instead of popping in instantly. | Open the Dialog or Select and watch it fade + scale in |

**How would a developer (not an AI) know they needed exactly these?** The same way this was actually checked, not from memory: running `npx shadcn add button --dry-run --view` prints the real generated code *before* anything is written, and its `import` lines at the top name every package it leans on. `npm view <package-name>` on npmjs.com shows a one-line description and confirms a package is legitimate before trusting it. That's the whole method — read what the tool is about to do, and read the library's own one-paragraph description — not something only possible with an AI in the loop.

### Why opening a Dialog/Select/DropdownMenu made the page "shake" — two real causes, tangled together
Noticed while clicking through the demo page: the page visibly moved for as long as a Dialog/Sheet/Select/DropdownMenu was open. This took three attempts to actually resolve, because there turned out to be **two separate real causes**, and fixing only one at a time either did nothing visible or made things worse.

**Cause 1 — the content itself shifting.** All four share a "scroll lock" that hides the browser's real scrollbar while open. The component library already compensates for that (pulling the content in slightly on the other side, so it visually stays put) — but that compensation depends on a slightly obscure browser default being left alone. The first fix attempted (forcing the scrollbar to always show) accidentally broke that default, which broke the library's own compensation, and made the content actually start shifting for the first time — worse than the starting point, not better.

**Cause 2 — the scrollbar itself flickering.** Independently of whether the content moves, hiding and reshowing the real scrollbar is itself a visible change, right at the edge of the browser window — even when the content behind it hasn't moved at all. This is what was still happening after undoing the first (broken) fix: the content had stopped shifting, but the scrollbar was still blinking away and back, which still reads as "shaking," just a different kind.

**The actual fix needed both pieces together, not one at a time:** keep the scrollbar permanently reserved (stops it from ever disappearing) *and* explicitly cancel the library's own compensation margin (since with the scrollbar now permanently there, that compensation is no longer needed, and — as discovered the hard way — leaving it in place is exactly what caused the first regression).

**The real lesson:** when a bug report describes one visible symptom ("it shakes"), it's worth checking whether more than one distinct mechanism could produce that same symptom, before declaring the first plausible-looking cause "the" cause. Fixing a real, measured problem is not the same as fixing *the* problem someone reported — especially when the fix touches shared, load-bearing behavior (like a scroll-lock library's own compensation) that something else was already quietly depending on.

---

## Next.js as a full-stack framework

### How is this different from a separate React front end + Node.js back end?
Asked while starting Step 8, worried about how "the back end" will actually get built later (Phase 2), since Next.js is described as "full-stack."

**The older, separate way:** two independent programs — a front end and a Node/Express back end — deployed as two separate things, talking over the network (the browser `fetch`es the Express server's API).

**The Next.js way:** front end and back end code live in the *same* project, mostly in the *same files*, using three tools instead of hand-wiring API routes: a **Server Component** (a page that talks straight to a database while rendering, no separate API call needed), a **Server Action** (a function marked `"use server"` that a form calls on submit), and a **Route Handler** (`src/app/api/.../route.ts` — a plain URL for things that aren't browser pages, like the future tap-station API, which a device calls directly with an HTTP request, not a browser session).

**What "deployed" means depends on where:** on Vercel (Next.js's own company), there's no server to manage — every page/action/route becomes an on-demand function that spins up per request. On a plain server/VM (`next start`), it's one long-lived Node.js process, shaped similarly to an Express server, just organized by Next.js's file-based routing. Either way: **one deployed thing, not two** — Phase 2's back end will be more files in this same project (Steps 9 uses a mock version of this shape already; Phase 2 swaps in a real database via Prisma), not a second program built from scratch.

**Full visual, interactive version:** [One Server, Two Jobs](https://claude.ai/artifact/6Sfdb2DEQhoTe9Qxz7d2QR) — diagrams the two-programs-vs-one comparison above, a page read, a Server Action write, and exactly where `getSession()` sits, plus how this compares cost-wise to a separate Express + JWT setup.

---

## Domain modeling: types vs. schemas

### What's the actual difference between a "domain type" and a "schema"? And is Step 8 front end or back end?
Asked after Step 8's files were listed for commit — "schemas" made sense, but "types" felt like a separate, unclear thing.

**A schema is a rule-checker that actually runs.** When real data shows up (a form submitted, a tap recorded), the schema is the code that checks it — "is this LRN exactly 12 digits?" — for real, every time the app runs.

**A type is a label used only while the code is being written — it doesn't exist once the app is running.** It tells the editor "a Student has these fields," so mistakes (a missing field, the wrong kind of value) get caught immediately while writing some *other* piece of code later, before anything runs. Types are stripped out completely when the code is built.

**Analogy:** the schema is the school clerk who actually checks a submitted form. The type is the blank form template itself — it shows what boxes exist, but never checks anyone's actual answers.

They're related on purpose in this project: the schema is written once, and the type is just read off of it automatically (`z.infer`, see [`docs/DATA-MODEL.md`](DATA-MODEL.md#schemasts-first-typests-second)) — not two separate things to keep in sync by hand.

**Front end or back end?** Neither — no screen changed, still no database or server. It's the shared vocabulary both sides will eventually use: the fake seed data is built to match it now, and the real Phase 2 database code will agree on the same shapes later.

---

## Tap stations and notifications (Phase 2 planning)

### Does a tap station need a native app, or a login, to use an NFC reader?
Discussed while reviewing Step 8's ER diagram (`Tap.stationId`) — full write-up in [`docs/DATA-MODEL.md`](DATA-MODEL.md) and the [[project-tap-api-hardware-agnostic]] / parent-notifications planning notes, kept short here.

**No native app needed.** A browser tab is enough. Most inexpensive USB/Bluetooth NFC readers work as "keyboard-wedge" devices — to the computer/tablet, they look exactly like someone typing the card's serial number (then Enter) into whatever's focused. On our own tap station page, that "focused spot" isn't a disconnected text box — it's a hidden, always-active part of *our own* page, watched by *our own* code, which reacts the instant a full serial arrives (shows success/duplicate/lost-card, no button to click). This works identically on a laptop, tablet, or phone, in any browser. Some Android phones/tablets can *also* read NFC directly through Chrome (no external reader at all, "Web NFC") — but that's Android-Chrome-only, so the external-reader path is the more universal one to rely on.

**Login vs. a registered device:** for now, requiring a staff login on the tap station (instead of a real per-device "station key") is fine — it's just a different way of answering "which school is this," and doesn't conflict with keeping the API hardware-agnostic later.

**Offline behavior:** a tap made while offline is generated and queued **on the device itself** (it already has its own ID, so it doesn't need the server to exist first) — it gets sent once the connection returns, and a parent notification only ever goes out *after* that.

---

## What is a "repository"? (Step 9)

### The librarian analogy
Asked while reviewing Step 9's repository files. A repository is like a library's front desk: you don't walk into the storage room and grab a book yourself, you ask the librarian, who knows where it actually is and fetches it. `studentRepository.listBySchool(schoolId)` plays that role for data — nothing else in the app ever reaches into the raw seed data file directly.

**Why bother, when today's data is just a hardcoded fake list?** Because that's exactly the point — today it's a fake list in a file; in Phase 2 it becomes a real database call. If every screen had reached into the fake list by name, all of those places would need rewriting later. Since everything only ever asks the repository, only the repository's own insides change when the real database arrives — everything that was already asking it keeps working, unaware anything changed underneath.

**See a repository being asked for data, and the "librarian" idea drawn out visually:** [One Server, Two Jobs](https://claude.ai/artifact/6Sfdb2DEQhoTe9Qxz7d2QR)'s "Reading data" and "Writing data" diagrams show `studentRepository`/`setDevSession` being called this exact way, end to end.

### Repository, compared to Express's Model/Controller/Service/Routes
Asked next, having previously worked with a layered Express backend. Short version — the Model/Repository half exists now (Step 8/9), the rest doesn't yet:

| Express/MVC | Talaan / Next.js | Built as of Step 9? |
|---|---|---|
| Model | Zod schemas + types (`src/features/*/schemas.ts`, `types.ts`) | Yes — Step 8 |
| Repository | `src/data/repositories/*.ts` | Yes — Step 9 |
| Service layer | `src/features/*/actions.ts` (Server Actions) | Not yet |
| Controller | Folded into Server Components (reads) + Server Actions/Route Handlers (writes) | Not yet |
| Routes | File-based — the page file *is* the route | Not yet |

Next.js merges what Express usually splits into two things (Routes + Controller) into one: a page file that's both the route definition and the code that fetches and renders it. **A fuller, dedicated write-up (with real code on both sides of the table) is intentionally saved for once Step 10+ actually builds the Controller/Service/Routes side** — see the `project-backend-layers-comparison-doc` memory. This table is the placeholder until then.

**Not the back end yet, but its future shape.** Same as Step 8's types/schemas — still Phase 1, still in-memory, no network. This is the pattern the real Phase 2 code will keep, not a preview of Phase 2 itself.

**Full write-up, with a diagram:** [`docs/DATA-ACCESS.md`](DATA-ACCESS.md).

---

## App shell and navigation (Step 10)

### Why passing an icon into a "use client" component crashed the app
Every Next.js file is either a **Server Component** (runs only on the server, can't hold click handlers or use browser-only hooks like "what page am I on") or a **Client Component** (marked `"use client"` at the top — runs in the browser too, so it *can* react to clicks and hooks, but costs a bit more since its code has to ship to the browser). Most of this app's files are Server Components by default — that's the CLAUDE.md-mandated default, and it's also just less code sent to the phone/browser.

The sidebar's nav links needed to highlight whichever one is the current page — that needs a Client Component, since only the browser knows "what page am I on right now" without the whole page reloading. So `Sidebar` (a Server Component) tried to hand its list of nav items — including each one's icon, an actual React component — to that Client Component as a prop. That broke, with the error *"Functions cannot be passed directly to Client Components"*. The reason: crossing from server code into client code isn't just calling a function normally — the data has to be able to survive being turned into a message and sent to the browser (a bit like sending a JSON payload), and a React component is executable code, not data, so it can't survive that trip.

**The fix, and the general pattern:** instead of resolving "which icons does this role see" on the server and handing over the result, the Client Component now just receives the *role* (a plain word like `"teacher"`) and looks up its own icons directly, since the list they're looked up from is a plain shared file both sides can read from independently. The rule of thumb: across that Server → Client handoff, only pass plain data (text, numbers, plain objects/arrays of those) — never a component, function, or class instance.

### What a "route group" is, and why `(app)` doesn't show up in the URL
A folder name in parentheses, like `src/app/(app)/`, is Next.js's signal that the folder is for *organizing files only* — it's invisible to the actual web address. `src/app/(app)/dashboard/page.tsx` is the page at `/dashboard`, not `/app/dashboard`. This exists so every "you have to be signed in to see this" page (dashboard, attendance, students, staff, tap station, schools) can share one `layout.tsx` (the sidebar + top bar) without that grouping leaking into every URL.

### Why the page title lives in two places now (`<h1>` and `<h2>`)
A screen reader user can jump between a page's headings the way a sighted person skims bolded section titles — but that only works if there's exactly *one* top-level heading (`<h1>`) per page, naming what the whole page is. This app's persistent top bar now shows that `<h1>` (e.g. "Dashboard") for every screen. Each screen's own content used to *also* print an `<h1>` with the identical word, which meant two "the most important heading" on the same page — confusing for anyone navigating by headings, not just a screen-reader edge case. The fix: the in-page one is now a step down, `<h2>` — still visually a big bold title (nothing looks different), just correctly marked as "a section of this page," not "the whole page," since the top bar already claimed that role.
