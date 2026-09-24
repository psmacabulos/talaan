# Learning log

Short, plain-language notes explaining things along the way — for whenever I want a reminder later. Grouped by topic, not by date, so a whole subject can be found in one place. Within each topic, newest entries are at the bottom. If a topic has a fuller write-up elsewhere (an interactive page, a longer doc), the entry here stays short and links out instead of repeating it.

## Contents
- [Command line & Git basics](#command-line--git-basics)
- [Keeping local and CI in sync](#keeping-local-and-ci-in-sync)
- [Colors and theming](#colors-and-theming)
- [Components and libraries (shadcn/ui)](#components-and-libraries-shadcnui)
- [Next.js as a full-stack framework](#nextjs-as-a-full-stack-framework)
- [Domain modeling: types vs. schemas](#domain-modeling-types-vs-schemas)
- [Tap stations and notifications](#tap-stations-and-notifications)
- [App shell and navigation (Step 10)](#app-shell-and-navigation-step-10)
- [CSS layout: Flexbox spacing gotchas](#css-layout-flexbox-spacing-gotchas)
- [Multi-tenant apps: one customer's identity doesn't belong on a shared screen](#multi-tenant-apps-one-customers-identity-doesnt-belong-on-a-shared-screen)
- [Seed data has a second job once real screens exist (Step 13)](#seed-data-has-a-second-job-once-real-screens-exist-step-13)
- [Search, filters and sorting living in the URL (Step 14)](#search-filters-and-sorting-living-in-the-url-step-14)
- [Forms: shared validation and writing data (Step 15)](#forms-shared-validation-and-writing-data-step-15)
- [Turning a Next.js web app into an iOS/Android app](#turning-a-nextjs-web-app-into-an-iosandroid-app)
- [Two separate logins in one app, and a mock password (Step 22)](#two-separate-logins-in-one-app-and-a-mock-password-step-22)
- [Accessibility: checking that everyone can use it (Step 27)](#accessibility-checking-that-everyone-can-use-it-step-27)
- [Phones vs. desktops: one list, two layouts (Steps 27.6–27.8)](#phones-vs-desktops-one-list-two-layouts-steps-276278)
- [End-to-end tests can quietly go stale (Step 29)](#end-to-end-tests-can-quietly-go-stale-step-29)
- [When "add more workers" doesn't fix a flaky test suite](#when-add-more-workers-doesnt-fix-a-flaky-test-suite)

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

### An `npm run` script that only worked in Git Bash, not from a real Windows terminal (Step 29)
`package.json`'s `test:e2e` script was written as `playwright test 'e2e/(login|students|...).spec.ts'` — one quoted argument, using `|` to mean "or" inside the file pattern. That syntax only means "or" to a shell that understands single quotes as quoting and `()`/`|` as regex characters once inside them — Bash, the shell Claude's own terminal tool uses. But `npm run <script>` doesn't run in whatever shell you happen to be typing into; on Windows, npm always hands the command to `cmd.exe` specifically, and `cmd.exe` doesn't treat single quotes as quoting *at all* — it just sees a literal `|`, which it always treats as "pipe this into the next command," breaking the whole line. So the script had likely never worked when actually run as `npm run test:e2e` from a plain Windows terminal — only a direct Bash-run `npx playwright test '...'` could ever have passed. Fixed by writing the file list as five plain space-separated arguments instead of one quoted pattern — no quoting or shell-special characters needed, so it means the same thing in `cmd.exe`, PowerShell and Bash alike. **Lesson:** when an npm script needs to work on Windows, avoid quoting tricks that only one shell understands — prefer syntax that needs no special shell behavior at all.

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

### How a school's real theme finally shows up, once a session exists (Step 11)
Steps 4-5 could only ever show one fixed theme, because nothing yet existed to ask "whose theme is this?" Step 11 is where a real signed-in school and the theming mechanism meet for the first time — and the way it's wired in is worth understanding since it explains why the root layout (the file that sets up fonts and dark mode for the *entire* app) needed almost no changes.

The trick reused from Steps 4-5: the same `<style>` tag mechanism can be rendered **twice** — once in the root layout (the plain app-wide default, unchanged since Step 4) and a second time inside the authenticated shell's own layout (`(app)/layout.tsx`), carrying whichever school is actually signed in right now. Because the second one is nested *inside* the first one's content, it always ends up later in the page's HTML, and — when two style rules are equally specific — the one written later always wins. So every page inside the shell shows the real school's colors, while the couple of standalone pages outside the shell (the design demo, the style guide) never even see that second style tag, and keep the plain default. No JavaScript decides this; it's just how CSS has always worked.

**A separate, smaller idea layered on top:** the top-bar theme dropdown that recolors things live is deliberately *not* the same as "this school's real saved color." It's a plain cookie — this browser's own temporary preview, gone the moment you switch to a different signed-in persona. Nothing gets written to any school's actual record until a real "Save" button exists (a later step).

### Why "make it grow forever" isn't actually the goal on a big screen (Step 11.5)
Asked for the site to visibly grow as the screen gets bigger, on a real monitor. The instinct might be "let it stretch to fill however wide the screen is" — but that's not actually what good, professional software does, and it's worth knowing why before assuming a bigger number is always better: a paragraph of text (or a wide table) that stretches across a 32" ultrawide monitor edge to edge becomes *harder* to read, not easier — your eyes have to travel further per line, and it's easy to lose your place. The fix real products use (and the one built here): let content grow generously with the screen, but stop it at a sane width once it's already comfortably large, and put any *extra* room to use as more columns or more items, not a longer line length. That's why the app's main content area is capped at 1600px past a certain screen width instead of just being told "always 100% wide" — full details, with a diagram, in `docs/APP-SHELL.md`'s Step 11.5 section.

### "Preview" vs. "save", and why a color gets corrected instead of refused (Step 26)
There are two ways to change colors, and they do different jobs:
- **The top-bar dropdown is a preview.** It is like holding a paint card up to a wall: only you see it, only in this browser, and nothing about the school changes. "Saved theme" puts the card down again.
- **Settings > Appearance is the real paint job.** Clicking Save stores the choice on the school's record, and every teacher and principal at that school sees it on their next page load. Saving also puts down any paint card you were holding, so you see what you actually saved.

A **custom color** always gets checked for readability (WCAG AA: text must stand out from its background by at least 4.5:1). Two different things can go wrong, and they are handled differently:
- **It isn't a color at all** (a typo like `#12`): refused, with a message, and Save stays greyed out.
- **It's a real color but too light for white button text** (a bright yellow, say): *corrected*, not refused. Buttons use a darker shade of the same color, and the page shows your color and the corrected one side by side, so nothing changes behind your back. Refusing would force the school to guess a darker shade themselves; the app can compute one that is guaranteed to pass.

Full mechanism, with a diagram: [`docs/STYLING-SYSTEM.md`](STYLING-SYSTEM.md)'s Step 26 section.

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

### A shadcn "style" doesn't have to carry every component (Step 12)
Running `npx shadcn add form` produced no error and no file — the CLI reported "No files" for that item. This project's `components.json` uses `"style": "radix-nova"`, a newer, from-scratch Radix-based style (its `button.tsx` imports `cn` from the standalone `cn` package, not the classic `@/lib/utils` helper most shadcn tutorials show). That style's registry simply hasn't shipped a `form` item yet — confirmed with `npx shadcn view form` (empty) vs. `npx shadcn view button` (full file) and `npx shadcn search @shadcn -q form` (the *classic* registry does have one, under a different style's conventions).

Rather than pull in the classic-style `form.tsx` (which would've mixed two different `cn`/Radix wiring conventions in the same project), the sign-in form was built directly against `react-hook-form` and the existing `Input`/`Label` components — no generated wrapper needed for one form. **The lesson:** a scaffolding CLI succeeding silently isn't the same as it succeeding — always check the actual file it claims to have added before assuming it's there.

### Adding a `size` prop to a component wrapping a real HTML element can collide with a *native* attribute of the same name (Step 12)
Giving `Input` a `size="lg" | "default"` variant (to fix inputs that looked too small next to their labels — see `docs/BUILD-LOG.md`'s Step 12 "review round 4") broke the type-check with a confusing error. Cause: a plain `<input>` already has its own built-in `size` attribute (an old HTML one — how many characters wide it is, a number), and `React.ComponentProps<"input">` includes it automatically. The new variant prop and the native attribute had the same name but different, incompatible types (a specific string vs. a number), and TypeScript couldn't reconcile the two into one prop.

**The fix:** `Omit<React.ComponentProps<"input">, "size">` before adding the variant's own `size` back in — explicitly telling TypeScript "ignore the native one, use mine instead." **Worth remembering for next time:** before naming a new prop on a component that wraps a real HTML element (`input`, `button`, `img`, `a`, ...), it's worth checking whether that element already has a native attribute of the same name — `size`, `type`, `form`, `title`, `color` and a handful of others are all real HTML attributes that can quietly collide with an intuitive-sounding prop name.

---

## Next.js as a full-stack framework

### How is this different from a separate React front end + Node.js back end?
Asked while starting Step 8, worried about how "the back end" will actually get built later (Phase 2), since Next.js is described as "full-stack."

**The older, separate way:** two independent programs — a front end and a Node/Express back end — deployed as two separate things, talking over the network (the browser `fetch`es the Express server's API).

**The Next.js way:** front end and back end code live in the *same* project, mostly in the *same files*, using three tools instead of hand-wiring API routes: a **Server Component** (a page that talks straight to a database while rendering, no separate API call needed), a **Server Action** (a function marked `"use server"` that a form calls on submit), and a **Route Handler** (`src/app/api/.../route.ts` — a plain URL for things that aren't browser pages, like the future tap-station API, which a device calls directly with an HTTP request, not a browser session).

**What "deployed" means depends on where:** on Vercel (Next.js's own company), there's no server to manage — every page/action/route becomes an on-demand function that spins up per request. On a plain server/VM (`next start`), it's one long-lived Node.js process, shaped similarly to an Express server, just organized by Next.js's file-based routing. Either way: **one deployed thing, not two** — Phase 2's back end will be more files in this same project (Steps 9 uses a mock version of this shape already; Phase 2 swaps in a real database via Prisma), not a second program built from scratch.

**Full visual, interactive version:** [One Server, Two Jobs](https://claude.ai/artifact/6Sfdb2DEQhoTe9Qxz7d2QR) — diagrams the two-programs-vs-one comparison above, a page read, a Server Action write, and exactly where `getSession()` sits, plus how this compares cost-wise to a separate Express + JWT setup.

### A Server Action a button *directly* calls needs its own file — a rule that only bit once a real button existed (Step 11)
Step 9 wrote `setDevSession` as a Server Action, but nothing called it from a button yet, so this rule had no chance to matter until Step 11 built the actual "view as" menu. There are two different ways a Client Component (a button, a menu — anything interactive) can end up running server code:

1. **A Server Component defines the action and hands it *down*** as a prop (`<SomeButton onSave={saveAction} />`). This can use the short inline form — `"use server"` as the very first line *inside the function's own body* — since the function is created fresh each render and passed along with everything it needs to run.
2. **A Client Component reaches *up* and imports the action by name** (`import { setDevSession } from "..."`) — what the dev switcher actually does. This needs the action in its own file, with `"use server"` on the file's very first line, not inside the function. `npm run build` enforces this for real: it failed with a genuinely confusing message (something about "the Pages Router," which this project doesn't even use) the first time this was gotten wrong, because the file the action lived in also had ordinary, non-action exports mixed in, and the bundler couldn't cleanly cut a client-safe reference out of it.

**Why the distinction exists at all:** in case 2, Next has to ship *something* to the browser standing in for that function (an id it can POST back to later) — and it can only safely do that cleanly for a whole file it knows is 100% actions, not a file where some exports are actions and others are ordinary server-only code the browser must never see.

### Navigating *from* a Server Action: `redirect()` (Step 12)
Step 11's dev switcher calls a Server Action but never navigates anywhere — it stays on the same page and relies on the "a cookie mutation is enough to re-render" behavior above. The login page's sign-in needed something more: after setting the session cookie, actually send the browser to `/dashboard`. Next's own answer is `redirect("/dashboard")` from `next/navigation`, called at the end of the Server Action itself (`src/features/auth/actions.ts`) — not `useRouter().push(...)` back in the button's click handler. `redirect()` works by throwing a special value that Next's own machinery catches and turns into navigation, so it has to be the last thing the action does; calling it doesn't "return" normally to whatever called the action.

### Staying put but showing new data: `refresh()` (Step 13)
Three different situations now, worth keeping straight, because they look similar and behave differently:

| The action... | What updates the screen |
|---|---|
| sets or deletes a **cookie** (Step 11's dev switcher) | nothing to do — Next re-renders the page automatically |
| should **send you to another page** (Step 12's sign-in) | `redirect("/somewhere")` from `next/navigation` |
| changes **data** and you stay put (Step 13's "Simulate a tap") | `refresh()` from `next/cache` |

The third one is the trap: "Simulate a tap" saves a new tap and the page should immediately show the new counts — but it touches no cookie, so it gets none of that automatic re-render. Without one extra line the button would appear to do nothing until you reloaded by hand. This was checked in Next's own documentation (`node_modules/next/dist/docs/`) rather than assumed, precisely because the cookie behavior from Step 11 made "it probably refreshes on its own" sound reasonable. It doesn't — and the fact that this Next.js version ships a `refresh()` function documented for exactly this case is itself the proof.

**The general habit worth keeping:** when something *seems* like it should happen automatically because a similar thing does, that's the moment to go read the documentation rather than build on the assumption. Wrong guesses here don't crash — they just quietly do nothing, which is much harder to notice.

### A logo with no database: `FileReader` → data URL → the school record (Step 25)
Phase 1 has no real file storage, so an uploaded logo has nowhere to "go" — except inside the form itself. The add-school form does exactly that: when a file is picked, JavaScript's `FileReader.readAsDataURL()` reads it on the visitor's own computer and turns the image into a **data URL** — a text string that *is* the whole image, base64-encoded, looking like `data:image/jpeg;base64,/9j/4AAQ...`. That string travels with the rest of the form values and lands on the school record's `logoUrl` field, so every screen that shows the logo just shows that same string. It works because logos are small (the form caps them at 1 MB); this exact trick would be a terrible idea for photos or documents at scale, and Phase 2's real storage will replace it without touching the screens.

Two things make it safe with Next's `next/image` (checked in `node_modules/next/dist/shared/lib/get-img-props.js` rather than assumed): Next detects a `data:` source and automatically serves it **unoptimized** (there's nothing to compress — the full bytes are already in the page) and disables lazy loading. So `next/image` is still the right component for data-URL logos — no plain `<img>` needed, and lint stays happy. The size guard lives in two layers: the picker rejects files over 1 MB client-side, and `createSchoolSchema` re-checks with `z.url().max(1_500_000)` (a 1 MB binary file is ~1.4 M characters once base64-encoded).

---

## Domain modeling: types vs. schemas

### What's the actual difference between a "domain type" and a "schema"? And is Step 8 front end or back end?
Asked after Step 8's files were listed for commit — "schemas" made sense, but "types" felt like a separate, unclear thing.

**A schema is a rule-checker that actually runs.** When real data shows up (a form submitted, a tap recorded), the schema is the code that checks it — "is this LRN exactly 12 digits?" — for real, every time the app runs.

**A type is a label used only while the code is being written — it doesn't exist once the app is running.** It tells the editor "a Student has these fields," so mistakes (a missing field, the wrong kind of value) get caught immediately while writing some *other* piece of code later, before anything runs. Types are stripped out completely when the code is built.

**Analogy:** the schema is the school clerk who actually checks a submitted form. The type is the blank form template itself — it shows what boxes exist, but never checks anyone's actual answers.

They're related on purpose in this project: the schema is written once, and the type is just read off of it automatically (`z.infer`, see [`docs/DATA-MODEL.md`](DATA-MODEL.md#schemasts-first-typests-second)) — not two separate things to keep in sync by hand.

**Front end or back end?** Neither — no screen changed, still no database or server. It's the shared vocabulary both sides will eventually use: the fake seed data is built to match it now, and the real Phase 2 database code will agree on the same shapes later.

### Why a parent↔student link needs its own "join" record (Step 20)
Everything built so far connects one record to another by putting a single id on one of them (a Card has one `studentId`). A parent and a student aren't like that: one parent can have several children, and one child can have several linked guardians (a mother and father both notified). Neither "put the student's id on the parent" nor "put the parent's id on the student" can express that without forcing an artificial one-of-them limit.

The standard answer is a third record — `ParentStudentLink` — that exists only to say "this parent is connected to this student." A parent's children are just "every link carrying their id"; a student's guardians are "every link carrying the student's id." It's the same trick a real database uses for any many-to-many relationship (students ↔ subjects, a person ↔ the groups they belong to), and it's why the link is its own thing here rather than fields on either Parent or Student. See [`docs/DATA-MODEL.md`](DATA-MODEL.md) for the diagram version, and note the related flat-copy choice for `Notification` there too.

---

## Tap stations and notifications

### Why notifications are created at tap time, not derived at read time (Step 24)
The first big build of this topic — the parent bell and feed — lives in [`docs/NOTIFICATIONS.md`](NOTIFICATIONS.md). The one contrast worth keeping in mind next to the attendance model: attendance *is* derived at read time (nothing stores "present"; it's computed from raw taps), but notifications are the **opposite** — a `Notification` row is written the moment a tap happens, and the bell/feed just read rows back. That's because a school's preference ("notify on time-in only") is a moment-in-time decision: if the principal turns notifications off tomorrow, yesterday's "your child tapped in" should still be in the feed. The parent was told; the record of being told should survive the setting change. So the read path has nothing to compute — it only joins, sorts, and counts unread rows.

### Does a tap station need a native app, or a login, to use an NFC reader?
Discussed while reviewing Step 8's ER diagram (`Tap.stationId`) — full write-up in [`docs/DATA-MODEL.md`](DATA-MODEL.md) and the [[project-tap-api-hardware-agnostic]] / parent-notifications planning notes, kept short here.

**No native app needed.** A browser tab is enough. Most inexpensive USB/Bluetooth NFC readers work as "keyboard-wedge" devices — to the computer/tablet, they look exactly like someone typing the card's serial number (then Enter) into whatever's focused. On our own tap station page, that "focused spot" isn't a disconnected text box — it's a hidden, always-active part of *our own* page, watched by *our own* code, which reacts the instant a full serial arrives (shows success/duplicate/lost-card, no button to click). This works identically on a laptop, tablet, or phone, in any browser. Some Android phones/tablets can *also* read NFC directly through Chrome (no external reader at all, "Web NFC") — but that's Android-Chrome-only, so the external-reader path is the more universal one to rely on.

**Login vs. a registered device:** for now, requiring a staff login on the tap station (instead of a real per-device "station key") is fine — it's just a different way of answering "which school is this," and doesn't conflict with keeping the API hardware-agnostic later.

**Offline behavior:** a tap made while offline is generated and queued **on the device itself** (it already has its own ID, so it doesn't need the server to exist first) — it gets sent once the connection returns, and a parent notification only ever goes out *after* that.

### How will "time in" and "time out" both show, if a student comes and goes more than once? (asked after Step 19)
Full write-up: `docs/BUILD-LOG.md`'s "After Step 19" entry and `docs/PLAN.md`'s Phase 2 notes. Short version: nothing new needs to be *stored* — every tap is already its own record today, no per-day limit, so the full history already exists. What was actually missing was two decisions: (1) a 1-2 minute window to tell an accidental double-tap from a real second visit, past which taps just alternate in/out/in/out; (2) how to *show* it — decided to keep the table simple (just "Time in"/"Time out", the first and last tap) and only reveal the full list for the rare student who tapped more than twice, rather than showing every row's full tap history all the time.

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

### "Shell" doesn't mean a terminal here — and what it actually is
Asked after "shell" got used a few times without ever being defined plainly, and it sounded like the Linux/command-line kind. Different meaning here: picture the whole app as a picture frame. The frame — the menu down the left side, the bar across the top with the page title — stays exactly the same no matter which page is open. Only the middle part, inside the frame, changes when a different menu item is clicked. That frame is "the shell" (also fair to just call it "the layout" or "the frame around every page" — all the same thing). It's one set of files (`src/components/app-shell/`) that every other screen gets wrapped in automatically, so nobody has to rebuild the sidebar/top bar by hand on every single page.

### What the dev switcher is for, and why mock data comes before the real database
The whole app right now runs on **make-believe data** — a handful of fake schools, fake students, fake staff, typed in by hand, not a real database. That's on purpose: it lets the entire look-and-feel of the app (every screen, every button, whether a teacher sees the right menu) get built and actually looked at and corrected *before* the much harder, riskier part (a real database, real logins, a real NFC card reader at the gate) gets built. Fixing "that button's in a confusing spot" is a five-minute change right now; the same conversation after a real login system exists would be slower, because more things would depend on it.

The **dev switcher** (the "Principal, Balanga City..." menu in the top bar) exists purely because of that choice. There's no real login yet, so there's no ordinary way to check "does a teacher see a different screen than a principal?" The switcher is a stand-in: pick a name from the list, and the app pretends that's who's signed in — same students, same screens, just viewed as a different role. It's marked "dev only" and is coded to vanish completely once the app goes live for real, because by then real logins will do this job instead.

### "Open a school" (Step 25) is the dev switcher's own swap, borrowed
The schools list's **Open** button needs to show a super admin *that school's app* — its colors, its logo, its principal's view — without a real multi-account login yet. The dev switcher already knows how to become someone else, so `openSchool()` reuses exactly that machinery instead of inventing a new mechanism: `setDevSession(principal.id)` (switch the pretend-signed-in user to that school's principal), `clearThemeOverride()` (drop the theme-override cookie so the *school's own* preset applies), then `redirect("/dashboard")`. Three existing building blocks; the only new part is finding the school's principal first via `staffRepository.listBySchool()`. That's also why the add-school form collects the principal's name and email: a brand-new school has no principal to switch into unless creating the school creates an **invited** principal account at the same time. (In Phase 2, "Open a school" could become a real super-admin privilege backed by a real session — the same three building blocks, minus the dev-cookie part.)

---

## CSS layout: Flexbox spacing gotchas

### `text-align: center` centers text — not the box it's in (Step 12)
Reported as "the school name isn't centered," with a screenshot showing it sitting to the left of the headline above it. The whole panel already had `text-center` set, so the instinct might be "that should already be handled" — but `text-align` only centers the *text inside* an element's own box; it says nothing about where that box itself sits.

The real cause: the headline and the subtitle were both inside a `<div style="flex flex-col">` with no `items-center`. The headline happened to fill the full width available to it (its text is long enough to force that), so it looked centered by accident. The subtitle has its own narrower `max-w-[22ch]` limit, and with nothing telling the flex column to center a child that doesn't fill the full width, the browser's default is to push it flush against the left edge instead.

**The fix was one class**, `items-center`, added to that wrapping div. **The general rule:** centering *text* and centering a *box* are two different CSS jobs — `text-align: center` for the first, `items-center` (in a flex/grid parent) or `margin: 0 auto` for the second. A bug report that says "not centered" could be either one, and they look identical until you check.

### Measuring instead of guessing when a screenshot alone doesn't explain the bug
Rather than nudge spacing classes until it looked right, ran a small script directly in the browser (`element.getBoundingClientRect()`, via Playwright's `page.evaluate`) to get the actual pixel position of the headline, the subtitle, and the panel around them. That's what turned up the real numbers (subtitle centered at a different x than the headline) and confirmed the fix afterward (both now land on the same x, at 360px, 1280px and 2560px). Full write-up: `docs/BUILD-LOG.md`'s Step 12 "review round 2."

### A plain `@import`ed CSS file can silently out-rank Tailwind's own utility classes (Step 12)
Reported as "the focus outline is too thick." Turning the ring down a size (round 4) didn't actually fix it, because ring width was never the real problem — checking the *computed* style of a focused input (not just looking at it) showed two separate focus outlines drawing at once: a native browser one *and* Tailwind's own. `src/styles/base.css` sets a plain, global `:focus-visible { outline: ... }` as a sensible-looking fallback, and every styled component (`Input`, `Button`, `Select`) already says `outline-none` specifically to turn that off in favor of its own nicer-looking ring. Normally `outline-none` should win — but `base.css` gets pulled in with a plain `@import`, not wrapped in Tailwind's own `@layer` system, and modern CSS has an explicit rule for this exact situation: **an "unlayered" style always beats a "layered" one**, no matter which one is more specific or which one loads later. Tailwind's utility classes (including `outline-none`) all live inside Tailwind's own named layers — so the unlayered global rule was quietly winning every time, showing its outline *in addition to* whatever ring the component tried to draw.

**The fix:** wrap `base.css`'s rules in `@layer base { ... }`, so they join Tailwind's own layer stack instead of floating above it. One CSS-only change, and it fixed every focusable element in the app at once (this was never login-specific), not just the one that got reported. **The general lesson:** when a project imports a plain CSS file *alongside* a utility framework like Tailwind, that file's rules can silently outrank the framework's own classes — regardless of how specific or "later" those classes look in the source — unless it's deliberately put in the same layer system. Worth checking with the browser's actual computed styles (not just how something looks) whenever two style sources for the same element might be fighting.

### A looping animation needs its own `prefers-reduced-motion` fallback — the site's blanket rule isn't always enough (Step 12)
The app already has one global rule (`base.css`) that neutralizes motion for anyone who's turned on "reduce motion": it forces every animation's duration down to nearly zero and caps it at one run. That's the right fix for a one-time entrance (something that fades in once) — at zero duration it just snaps straight to its final, fully-visible state, instantly. It's the *wrong* fix for an infinite decorative loop, like the new login page's value-prop carousel (see `docs/BUILD-LOG.md`'s Step 12 "review round 5"): at zero duration, "run the loop once and stop" lands on whatever the keyframe's *last* frame happens to be — which for a fade-in/fade-out loop is invisible. Without a specific fix, everyone with reduced motion turned on would have seen nothing there at all.

**The fix:** added `motion-reduce:` classes directly on top of the animated ones (Tailwind's built-in variant for this exact media feature) that turn the animation off entirely and force the element to just sit there, fully visible, instead. **The lesson:** the site's one global "turn motion down" rule is a good default, but it assumes every animation ends somewhere reasonable when played for ~0 seconds — an infinite loop doesn't, so it needs its own explicit, deliberately-chosen fallback, not just a trust that the blanket rule will handle it. Checked by actually emulating the setting in the browser (Playwright's `emulateMedia`) rather than assuming.

**Where "reduce motion" actually lives, and why it looked broken instead of correct at first:** the carousel appeared static (not looping) when checked in a real browser, but looped fine in Claude's own test browser — looking like a bug. It wasn't one: `prefers-reduced-motion` isn't a browser setting, it's read from a **Windows** setting (Settings → Accessibility → Visual effects → "Animation effects"), and it was switched off. Claude's test browser only showed the animation because it had been explicitly told (via a Playwright testing command) to ignore that setting for testing purposes — not because it was reading some different, correct value. Once "Animation effects" was switched on in Windows, the real browser matched. Worth remembering: this setting affects *every* app and website on the PC that respects it (this one included, on purpose), not just this one page — and switching it back off later isn't "breaking" anything, it's the site correctly noticing a real preference again.

### Don't just shrink the desktop layout for mobile — ask if the same content belongs there at all (Step 12)
The login page's desktop version has a big decorative left panel (logo, headline, tagline). Below the point where the screen switches to one column, that whole panel was stacking *above* the sign-in form, in full — same size, same content, just moved. It technically worked (no errors, nothing broken, checked every round), but it meant a phone had to scroll past a large decorative block before reaching the one thing it opened the page to do: sign in.

**The fix wasn't smaller spacing — it was different content.** Below that breakpoint, the decorative panel disappears completely (`hidden lg:flex` — gone, not shrunk), replaced by a small heading with just the words "Attendance portal," so the sign-in form is the first real thing on the screen. **The lesson:** "does this render correctly on a small screen" and "does this make sense on a small screen" are two different questions — the first is what a quick check confirms, the second needs someone to actually ask "does the *first* screen's worth of content on this device do the visitor's actual job."

### Two quiet "wins" over my own classes, both found by measuring (Step 25)
Both of these look fine on a desktop and only show at a phone width — and neither throws an error, so the browser console gives no hint:

1. **A base class you don't see can out-live your additions.** shadcn's `Label` component ships with `items-center` baked in. The preset-picker made the label `flex-col` (stacked name-over-swatch) but never overrode that centering, so both children rendered *centered* — and the 74px swatch, wider than its 49px label box on a phone, overflowed it on both sides, nearly touching the card's border (measured, not guessed: swatch right edge 203.9px against the card's 204.6px). The fix had two parts: an explicit `items-start` (tailwind-merge keeps it over the base's `items-center`) *and* stacking the preset cards on phones (`grid-cols-1 sm:grid-cols-2`) so each card is wide enough for the swatch at all.

2. **A `data-[…]`-variant utility outranks a plain one — and tailwind-merge won't tell you.** The drawer's `SheetContent` base classes include `data-[side=right]:w-3/4` and `data-[side=right]:sm:max-w-sm`. I added plain `w-full sm:max-w-lg`, expecting them to win. They didn't: tailwind-merge only merges classes in the same *modifier group* (a `data-[side=right]:`-prefixed utility and a bare one are different groups, so both stay), and in the browser the attribute selector `[data-side=right]` beats a plain class on specificity. Result: the drawer renders ¾ of the screen on a phone and 384px on desktop no matter what width classes the caller passes — which is also true of the (owner-approved) staff drawer, so nothing was broken app-wide. The fix here was honesty, not CSS: the dead classes were removed and the comment now states the real behavior. If a full-width mobile drawer is ever wanted, it's one small change in `sheet.tsx`, not per-drawer.

**The general habit from both:** when a class you wrote appears to do nothing (or does something *slightly* off from what you wrote), measure the rendered box and read the component's base classes — the answer is usually a base class or variant you never saw winning quietly.

---

## Multi-tenant apps: one customer's identity doesn't belong on a shared screen

### The login page showed one school's real name and logo to every school's staff (Step 12)
The login screen's left panel was built with Balanga City NSHS's actual name and seal — matching the approved prototype, which also hardcodes one demo school throughout. That's fine for a *prototype* (it only ever needs to demonstrate one look), but Talaan itself is multi-tenant: many schools use the same app, each seeing only their own data once signed in. The login screen, though, renders **before** anyone is signed in — there's no school known yet at that point, no session to read one from. Showing Balanga's own branding there meant a teacher at a different school, opening the same login page, would see someone else's school name and seal above the sign-in form — confusing at best, and not really "Balanga's page" or "that other school's page," just wrong for everyone.

**The fix:** the login screen now carries generic product identity only — a plain "Attendance portal" heading, a tap-themed icon (not tied to any school), and a one-line description of what the product does. Nothing school-specific renders until *after* someone actually signs in, at which point the app already knows — from their account — which school's data and branding to show.

**The general rule, worth remembering for every future screen:** before building a screen, ask *when* it renders relative to knowing who the user is. A screen that can render before sign-in (login, a public marketing page, a "forgot password" screen) can only safely show information true for *everyone* — never one specific customer's/school's own data, even if the reference design or the current test data only shows one example of it.

---

## Seed data has a second job once real screens exist (Step 13)

### Data written to prove a shape is not the same as data written to fill a screen
Step 8's sample taps were written to show what a tap *record* looks like — one ordinary tap, a small group on time, one late arrival, one lost-card tap. Seven students, all in grades 7 and 8. Perfectly good for its purpose, and the tests that checked it all passed.

Then Step 13 built the dashboard on top of it, and the same data suddenly said something quite different: a school where four of the six grades never showed up, 19% attendance, and a row of 0.0% bars. Nothing was broken — every number was correctly computed from exactly what was there. The data just wasn't *portraying* anything.

**The fix was to add a plausible whole morning around the original scenarios** (most students tapping in across every grade and school, a few deliberately absent, a few late), keeping every hand-written scenario intact. Two details worth copying next time:
- It's **generated by arithmetic, not randomly** ("every 7th student is absent"), so the dashboard shows the same numbers on every run. Random sample data means screenshots that never match and a demo that looks different each time you show it.
- It **respects the rest of the data's own rules** — students with no card issued don't tap, because at a real gate they couldn't.

**The lesson:** sample data usually gets written once, early, to satisfy a type or a test. The first screen that actually *displays* it is a second, different test of that data — and it's worth re-checking then whether it tells a true and useful story, not just whether it's correctly shaped.

### A number on screen can be the clearest bug report you'll get
The dashboard's first render said "0 Present, 7 Late" — every single student late. No error, no failing test, nothing a type-checker could catch. But the number was obviously wrong on sight, and it pointed straight at a cutoff time set to 7:30 AM when the sample taps (7:56-8:01, described in their own comments as "on time") assumed something closer to 8:05. Worth remembering that "the screen shows a number that can't be right" is real evidence, and often faster to act on than re-reading the code that produced it.

---

## Search, filters and sorting living in the URL (Step 14)

### Why the address bar is the state, not React
The Students list's search box, grade filter, card filter, sort column and page number are all read out of the URL's query string (`?q=cruz&sort=age&page=2`), not out of any component's own memory. That's what CLAUDE.md's "server-driven... kept in the URL" rule actually buys: reload the page and the same filters are still applied; copy the link to a colleague and they see the same list; click the back button and it steps back through what you'd actually done, one filter or sort change at a time. None of that works if the state only lives inside React. Full write-up: [`docs/URL-DRIVEN-LISTS.md`](URL-DRIVEN-LISTS.md).

### Sorting a table needs zero client-side JavaScript
Every column header is a plain link to a new URL (`/students?sort=age`) — clicking it is an ordinary page navigation, same as clicking any other link, and the server sends back the correctly-sorted page. No "sort state," no client component required for that part at all. The only place this list genuinely needs `"use client"` is the search box, because it has to react to individual keystrokes — everything else (selects, sort headers, pagination) works as plain server-rendered links.

### `replace` vs `push`: not every URL change should be a back-button stop
`router.push(url)` adds a new browser-history entry; `router.replace(url)` swaps the current one without adding a new entry. Typing "cruz" into the search box updates the URL after every debounced pause — using `push` for that would mean the back button has to click through "c", "cr", "cru", "cruz" one at a time to get back to where you started. The search box uses `replace`; changing a grade or card filter (a single, deliberate choice) uses `push`, so the back button treats it as one real step.

### A lint rule caught a real React footgun: don't `setState` synchronously inside `useEffect`
Syncing the search box's text when the URL changes from somewhere else (the back button, clicking a sort header) looks like an obvious job for `useEffect(() => setQuery(params.q), [params.q])` — but this project's lint config (`react-hooks/set-state-in-effect`) refused to build with that, because it causes React to render once with the old value and then immediately again with the new one. The fix is a pattern from React's own docs for "reset state when a prop changes": compare the incoming value to a tracked copy *during render* and call `setState` right there if they differ, instead of inside an effect. One render cheaper, and the lint rule was right to flag it.

### Why clicking "Next page" shows a brief loading flash instead of feeling instant (owner question)
Asked why paging/sorting/filtering the Students list shows a loading skeleton each time, when it feels like it should be instant since "the data's already there."

It isn't already there. Nothing loads the whole student list into the browser up front — every click is a real request to the server for a fresh page, the same as clicking a link from page 1 to page 2 of any ordinary website, not a script filtering data that's already sitting in memory in the browser. Two things are stacked into that pause: the real request/response round trip itself, and a small *simulated* delay (`src/data/repositories/latency.ts`, ~150ms, added back in Step 9 on purpose) so that code never accidentally assumes data arrives instantly — a real database call over a real network never does, and Phase 2 replaces the mock data with exactly that. The loading skeleton itself is just Next.js's built-in behavior while a page waits on that round trip.

Both halves are deliberate, not accidental: loading only the current page of students (rather than the whole roster) is what actually lets this scale to a real school with hundreds of students and a real database in Phase 2 without rebuilding the screen. Full mechanism: [`docs/URL-DRIVEN-LISTS.md`](URL-DRIVEN-LISTS.md#why-changing-a-page-filter-or-sort-shows-a-brief-loading-state).

## Forms: shared validation and writing data (Step 15)

### Why the same validation rules are checked twice
The add/edit drawer checks a submission in the browser (so a typo shows an error instantly, no waiting on the server) *and* checks it again on the server, right before saving. That's not duplicated work by accident — a form's own client-side check can always be skipped (a direct request, a browser extension, a bug), so the server never trusts that a submission it receives is actually valid just because it came from a form. Reusing the exact same Zod schema on both sides means there's only one set of rules to keep correct, even though it's checked in two places. Full write-up: [`docs/FORMS.md`](FORMS.md).

### Wiring a dropdown into a form that isn't a plain `<input>`
React Hook Form's usual `register("field")` only works on a real HTML input element. The shadcn "Select" dropdown is built differently (for its own accessibility/keyboard behavior) and doesn't support that directly — it needs a small adapter piece, React Hook Form's `Controller`, that manually connects the dropdown's selected value to the form. Any future dropdown/date-picker/toggle field in a form follows the same shape. See `docs/FORMS.md`'s "Wiring a non-native input" section.

### A "the button lives in one place, the click happens in another" problem
The "Add student" button is up in the page header; clicking a table row does the same job (opens the same drawer) from a completely different part of the screen. Rather than pass the "please open the drawer" instruction back and forth awkwardly between separate pieces, both the header and the table are rendered by one shared piece of code that remembers "is the drawer open, and for whom" — so either one can just say "open it" and the drawer already knows what to show. See `docs/FORMS.md`'s "Why drawer state lives above both the trigger and the table" section.

## Turning a Next.js web app into an iOS/Android app

### Do we have to rewrite everything to get onto the App Store and Play Store? (owner question)
Asked when the plan changed from SMS to a companion app. No — there are two real paths, and neither means throwing away what's already built:

- **Capacitor** (the recommended path for this project) wraps the *existing* web app in a thin native shell — same Next.js/React code, packaged so it can be submitted to both stores, with plugins for native features like push notifications. One codebase.
- **React Native** is a genuine rewrite: the logic (types, validation) can be shared, but every screen gets rebuilt with native components instead of the Tailwind/shadcn ones already in this project. Can feel more "native," but is a second UI to build and maintain — a lot more cost for a small pilot.

Either way, a **real** push notification (one that arrives even with the app closed) still needs a server that holds each phone's push subscription and can trigger Apple/Google's push service — that's Phase 2/3 backend work, not something either wrapping approach gets around on its own.

This is a real decision, but it's deliberately not locked into the docs yet — see the "Plan history" note in `CLAUDE.md` and `docs/PLAN.md`'s Phase 3 — because it's costly to reverse and there's no reason to commit to it this far ahead of actually starting that phase.

---

## Two separate logins in one app, and a mock password (Step 22)

### Why parents get their own cookie instead of reusing staff's session
The staff login (`/`) was never a real login — it always signs in as a fixed demo persona, no password actually checked (that's Phase 2). The parent login had to be genuinely real for this step to mean anything (sign up, sign back in, still see the link), so it couldn't reuse that same mechanism. Rather than stretch the staff `Session` type to cover two very different kinds of "who's signed in," they got their own separate browser cookie (`talaan-parent-session`) and their own small set of helper functions — completely independent, so neither login can accidentally interfere with the other. A browser can be signed in as staff and as a parent at the same time, in the same window, because they're stored separately.

### Storing a password with no real database yet
Phase 1 has no database — every "table" is really just a JavaScript array of seed data sitting in memory, and it resets whenever the server restarts. Given that, hashing a password (the real, secure way — see `docs/AUTH.md` once Phase 2 writes it) would be Phase 2 work applied to something that isn't Phase 2 yet. Instead, this step keeps passwords in a small in-memory lookup right next to that same array, in plain text, clearly labeled as a placeholder. It's not a real security concern *yet* because there's no real data behind it to protect — but it's exactly the kind of shortcut that must not survive into Phase 2, which is why every place it appears in the code says so in a comment.

## Accessibility: checking that everyone can use it (Step 27)

The full write-up, with code and a diagram, is [`docs/ACCESSIBILITY.md`](ACCESSIBILITY.md). These are the short versions.

### What axe is, and what "serious" and "critical" mean
axe is a free checker that reads a web page the way assistive technology does and lists anything that breaks a known accessibility rule: text too faint to read, a button with no name, a form field with no label. Every finding comes with an impact level. **Critical** means some people can't use that part at all. **Serious** means it's very hard for them. **Moderate** and **minor** are real, but they're annoyances rather than blockers. Step 27's rule, "no serious or critical findings", is the usual line for "ready to ship". axe can't judge everything (for example, whether a heading actually describes its section), which is why keyboard behavior was checked separately.

### Why the checks open a real browser instead of reading the code
Most accessibility problems only exist once a page is drawn: colors on top of other colors, a table too wide for a phone, a drawer that's open. Playwright opens a real Chromium browser, signs in as each role by setting the same cookie the dev switcher sets, and visits every screen at phone and desktop width, in light and dark. axe then checks what's actually on screen.

### A table you can't scroll with a keyboard
On a phone, the Attendance and Staff tables are wider than the screen and scroll sideways inside their own box. With a mouse or finger that's fine. With only a keyboard, you can only scroll something that can take focus, and those tables had nothing focusable inside them, so the right-hand columns were unreachable. The fix makes the table's scroll box itself focusable and gives it a name ("Attendance"), so Tab lands on it and the arrow keys scroll it.

### Where keyboard focus goes when a drawer closes
Focus is the "you are here" marker for keyboard and screen reader users, and the ring you see when you press Tab. When a drawer closes, focus should go back to whatever opened it, so the person carries on from where they were. Our add/edit drawers are opened from code instead of the library's own "trigger" button, so the library didn't know where to send focus back. It fell to the top of the page, and a keyboard user would have had to Tab through the whole sidebar again. The shared drawer component now remembers the opener itself.

### The "Skip to main content" link
It's invisible until you press Tab on a page. Then it's the first thing you reach, and pressing Enter jumps past the sidebar or header straight to the page content. Without it, a keyboard user would have to Tab through every navigation link on every page they visit.

### Landmarks: a table of contents for screen readers
Screen readers can list a page's regions (header, navigation, main content, sidebar) and jump straight to one. Those regions come from HTML tags like `<main>`, `<nav>` and `<aside>`, not from how the page looks. The login screens had no `<main>`, so a screen reader user couldn't jump straight to the form.

### Why the light/dark button was missing, and why it has three choices (Step 27.5)
Until this step, Talaan simply copied your phone's or computer's own light/dark setting, with no button to change it. The prototype never had a button, so the plan never listed one. Now a sun (or moon, in dark mode) icon opens a small menu:
- **Light** or **Dark** lock the app to that look on this browser, whatever the device does.
- **Match device** (the default) keeps following the device's own setting, which is how it behaved before.

A plain one-click switch can't express "go back to following my device" once you've clicked it, which is why there are three choices instead of two. The choice is remembered by the browser, not by the school or your account, so a teacher's phone and their office PC can differ. It's separate from the school's color theme (Settings > Appearance): that one changes the *colors*, and this one only changes light vs. dark. How it works under the hood is in [`docs/STYLING-SYSTEM.md`](STYLING-SYSTEM.md) section 5.

### When a test failure isn't a bug in the app
Three of this step's first failures were the test being too quick or too literal, not the app being wrong:
- A result card was checked while it was still fading in, so it read as low contrast.
- A button was checked while it was still fading back from "disabled".
- A test expected form errors to use one announcement pattern when the forms use another, equally valid one.

Each was confirmed by looking at the actual page before the test was changed. The rule is to prove it's a test problem, never just loosen the test until it passes.


## Phones vs. desktops: one list, two layouts (Steps 27.6–27.8)

### Why a table becomes a compact list on a phone
A table is great on a desktop because your eye can run straight down one column ("which of these is still Invited?"). A phone has room for maybe two columns, so the rest ends up off-screen and you have to drag sideways, losing track of which row you were on. So on a phone each person becomes one short row: name, plus one line saying what they do. The switch happens at 768px wide (roughly a small tablet held upright).

The first try was a tall card per person showing *every* field with labels. It fitted, but at about 190px per person a list of 30 staff (or 500 students) would take ages to scroll. The lesson is that a phone isn't a small desktop, so decide what each row is *for*:
- **Say it once, in words.** "Adviser, Grade 7 – Rizal" says the role and the class in one line, so it needs no "Role:" or "Advisory class:" labels.
- **Status by exception.** If almost everyone is "Active", showing it on every row is noise that hides the one "Invited" that matters. Only show the unusual.
- **Details one tap away.** The email moved into the ⋮ menu. It's rarely needed, so it doesn't earn a line on every row.

Both versions are actually sent to the browser, and the styling shows only the one that fits the screen. That sounds wasteful, but it means the page arrives already correct for your device instead of loading the wrong one and jumping. The full explanation, with diagrams, is in [`docs/RESPONSIVE-LISTS.md`](RESPONSIVE-LISTS.md).

### Using a sample design as a benchmark, not a blueprint (Step 27.7)
The phone mockup you shared was a good guide to the *feel* you wanted: cards, the status easy to spot, and controls sized for a thumb. Some of its details would have worked against this app, though, so each one was checked before it was copied:
- **A "Linked" tag on every card** is the same noise problem as "Active" on every staff row. Only the unusual ("No card", "Lost") is shown.
- **Age and LRN on the list:** students are minors, so the list shows as little about them as it can.
- **Scrolling filter pills** hide some choices off the edge of the screen, the same problem as a table you have to drag sideways.
- **A bottom navigation bar** holds 4–5 tabs, and principals have 6 sections. It would need a "More" tab, and it changes every page, so it's a decision of its own. You chose not now.

The full list of what was kept and why is in [`docs/RESPONSIVE-LISTS.md`](RESPONSIVE-LISTS.md) (section 3).

For the second sample (Attendance, Step 27.8), you said what it was for: the **layout**, not its colors or uppercase labels. That's a useful thing to say with any sample. The layout came across: the full-width date, grade and section side by side, the four count tiles, the "Students · 6 total" heading, and the time under the status. The styling stayed this app's own: sentence-case labels, the school's theme colors and the same badges as every other page. A sample made in another tool almost always carries that tool's look, and copying the look page by page would slowly turn the app into a patchwork.

### What is the "class roll"? (owner question, Step 27.8)
It's the list a **teacher** sees on their **Dashboard**, the first page after a teacher signs in. It's a box titled "Class roll" with every student in the teacher's own advisory class and whether each one has arrived today. ("Roll" as in "taking the roll" or "roll call".) Principals don't see it; they get "Attendance by grade level" instead. To see it: switch to the teacher with the dev switcher and open Dashboard.

On a phone it's the same layout as the Attendance cards, but as rows with thin lines between them rather than separate boxes. It already sits inside a bordered box, and boxes inside a box look cluttered and leave the names less room. Rule of thumb: **cards for a list that is the whole page, rows for a list inside a panel.**

### Dark lines that nobody chose (Step 27.8)
The lines between table rows, the drawer's left edge and the line above a dialog's buttons were dark navy in light mode. It looked like a design decision, but nobody had made it. In Tailwind v4, a border without a color gets the **text** color, and shadcn's setup normally adds one line saying "every border uses the border color". That line was missing here. It was found by measuring the actual color on screen (dark, `oklch(0.252…)`) and comparing it with the border color (light, `oklch(0.923…)`), not by eye. Before adding the missing line, every border in the code was checked so that nothing else would change by surprise. The lesson: when something "has always looked like that", check whether it was chosen or is just a default.

### Cards vs. one divided list: the trade-off (Step 27.7)
Both show the same short content. **Cards** (separate boxes with a gap) make each student feel like one tappable thing and match the mockup. **A divided list** (one box with thin lines) fits about one more row on the screen. You chose cards, and Staff switched too so the two pages look the same. Keeping the cards short (about 65px) is what keeps a long list quick to scroll.

### "Add" on a phone, "Add student" on a computer (Step 27.7)
On a phone the button next to the page title just says "Add", so it fits beside the title instead of dropping onto its own line. A screen reader still hears "Add student", because the button carries a hidden label with the full name. The visible word has to be the *start* of that hidden label, so someone using voice control can say "click Add" and it still works.

### A red button that failed only when hovered
The automated audit caught something no one would spot by eye. The red "Remove" button's text passed the contrast rules normally, but when the mouse was over it the background turned a deeper pink and the text became too faint (4.12 instead of the required 4.5). It only surfaced because the confirmation box happened to open right under the mouse. It's fixed for every red button in the app: hovering now fills the button solid red with white text. It's a good example of why a test failure is investigated rather than silenced.

### The ⋮ menu ("kebab" or "overflow" menu)
The three dots hold the actions for one row: here, Resend invitation and Remove. It keeps each row tidy instead of showing several buttons on every line. Two rules it follows:
- **It only offers what's actually possible.** Resend only appears for someone who hasn't accepted yet, and you can't remove yourself, so your own row has no ⋮ at all.
- **Anything that deletes asks "Are you sure?" first.** The server double-checks the same rules, because a button being hidden doesn't stop someone from sending the request another way.

### Why the drawer only filled three-quarters of the phone
The ready-made drawer component (from shadcn/ui) has its own width rule: 75% of the screen. Our code said "full width", but the component's rule was written in a more specific way, and in CSS the more specific rule wins, even if ours comes later. The fix was to write ours in the same specific way. A useful habit: when a style you wrote "doesn't work", something more specific is usually overriding it. The browser's inspector shows which rule won.

### Checking a phone layout in Chrome's device mode
In Chrome, F12 opens DevTools, and the phone/tablet icon (or Ctrl+Shift+M) switches to device mode, where you pick a device such as "iPhone SE". Two things to know:
- **The preview panel itself can be narrower than the device.** If the DevTools panel takes up a lot of the window, Chrome may crop or scroll the *preview*, which looks like the page is too wide when it isn't. Dragging DevTools narrower, or docking it to the bottom (⋮ menu in DevTools → Dock side), gives the preview room. This is my best guess for why the whole staff page looked cut off in your screenshot while my measurements showed it fitting. It isn't confirmed.
- **Device mode is Chrome pretending.** It's a very good check for layout, but a real iPhone runs Safari's engine, which can differ in small ways. Before launch it's worth one look on a real phone.

---

## End-to-end tests can quietly go stale (Step 29)
A passing test suite (Step 28) doesn't mean it stays accurate forever — if the app's real text or structure changes later and nobody reruns the tests against it, they can drift into checking for things that no longer exist while still technically "having passed once." Running the whole suite fresh during Step 29's final polish found 26 of 162 tests failing this way. None were bugs in the app — every one was the test guessing at markup that either never matched, or stopped matching once Steps 27.5–27.8 changed real button/badge text.

### A screen-reader label can accidentally match more than one thing
Playwright's `getByLabel("Password")` doesn't just find the field labeled "Password" — by default it matches *any* accessible name containing "password" as a substring, case-insensitively. The little eye icon that shows/hides a password has `aria-label="Show password"`, which contains "password" too, so the same locator matched both and Playwright refused to guess which one you meant ("strict mode violation"). A "Confirm password" field has the same problem with a plain "Password" search. The fix is `{ exact: true }` wherever the label needs to match *only* itself, not a phrase containing it.

### shadcn's dropdown isn't a real `<select>`, so `.selectOption()` silently can't drive it
shadcn/ui's `Select` component (built on Radix UI) renders as a button with `role="combobox"` that opens a floating list on click — nothing like the browser's native `<select>` element, even though it looks and behaves like one to a person using it. Playwright's `.selectOption()` command only works on a genuine `<select>`; pointed at a shadcn Select, it just times out waiting for something that will never happen. Driving one from a test means doing what a person does: click the button to open it, then click the option you want (`page.getByRole("option", { name: "..." }).click()`).

### An `aria-live` region isn't a dialog, even though both "pop up" a result
The tap station shows its result (name, time, status) in a plain `<div aria-live="polite">` — the right choice for a small updating status message a screen reader should announce automatically, and exactly what CLAUDE.md's accessibility rules ask for. But the original tests assumed it was a modal `role="dialog"`, since visually it looks like one "appears." `aria-live` and `role="dialog"` are unrelated: a dialog is a thing you enter and must explicitly close (and expects a focus trap); an aria-live region just quietly announces a change in place. Testing it means matching the actual text that appears, not a dialog role that isn't there.

### When copy changes, only the actual rendered words are the source of truth
Several failures were just wrong expected text: a test checking for "Email is required" when the real message has always been "Enter a valid email address"; "Active" when the badge has always said "Linked"; a button whose test expected it to still say "Simulate offline" after being clicked, when it relabels itself "Go back online". None of these were typos introduced later — they were the test's original guess never having matched the real component. **Lesson:** when writing a test's expected text, copy it from the actual rendered page (or the component's source), never from memory of what it "should" say.

### The same student can be described three different ways depending on which screen you're on
While fixing the parent-flow test, found that the tap-station result and the "link a child" form both use a student's full name or last name, but the parent's notification bell only ever shows the first name ("Carmen tapped in") — three genuinely different, all-correct conventions for naming the same person depending on the audience (staff needing to identify exactly who, vs. a parent who already knows). A test written against the wrong one of the three will fail even though nothing is broken.

## When "add more workers" doesn't fix a flaky test suite
Three pushes in a row failed CI on the same two e2e tests. The obvious-looking fix — force everything onto a single worker so nothing runs at the same time — didn't actually fix it; the exact same two tests failed again, every time. Full write-up: `docs/BUILD-LOG.md`'s "Between Step 29 and Step 30" entry; `docs/TESTING.md` documents the actual mechanism.

### "Random" and "wrong" aren't the same failure
A single worker doesn't mean *nothing races* — it just makes the run order fixed and repeatable instead of random. If that one fixed order is *itself* wrong (something always grabs a shared resource before the thing that needed it does), the test fails every single time under one worker, exactly as often as it did with several. The tell: a "flaky" test that suddenly fails 100% of the time once you remove the randomness is telling you the bug was never really about *timing* — it was about *order*, or about there simply not being enough of something to go around.

### Several tests quietly sharing one mutable pile of data is its own kind of bug
The tap station's "Valid card" button always hands out the *next* untapped student from the seed data — fine for one test, risky the moment more than one test clicks it against the same running server. Nothing marks that pool as "shared, handle with care"; it just happens to be one array in memory that every request reads and writes. The fix ended up being two things together: enough spare supply that running out stops being possible in the worst case, and not *assuming* which specific student a test will get — read back whatever actually happened and work from that, instead of hardcoding an expected name.

### A "random-looking" name generator can have a hidden repeat
Adding extra seed students to fix the above created a *new*, sillier bug: one of the new students ended up with the exact same name as an existing one, because the name generator cycles through a fixed list of 40 first names and 40 last names — continue past 40 students and it starts reusing the same names again, deterministically, at a predictable spot. "Looks random" and "never repeats" are not the same guarantee; a generator built from a small fixed list needs an explicit plan for what happens once you ask it for more than the list's size.
