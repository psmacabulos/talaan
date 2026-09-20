# Learning log

Short, plain-language notes explaining things along the way — for whenever I want a reminder later. Grouped by topic, not by date, so a whole subject can be found in one place. Within each topic, newest entries are at the bottom. If a topic has a fuller write-up elsewhere (an interactive page, a longer doc), the entry here stays short and links out instead of repeating it.

## Contents
- [Command line & Git basics](#command-line--git-basics)
- [Keeping local and CI in sync](#keeping-local-and-ci-in-sync)
- [Colors and theming](#colors-and-theming)
- [Components and libraries (shadcn/ui)](#components-and-libraries-shadcnui)

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
