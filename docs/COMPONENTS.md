# The component library (shadcn/ui)

Step 5 (`docs/STYLING-SYSTEM.md`) is about *color* — where a token's value comes from, and how it gets from `tokens.css` to the screen. This document is the next layer up: the actual interactive pieces (buttons, dialogs, dropdowns, tables) built *on top of* that color system, added in Step 6.

## What shadcn/ui actually is

It isn't a normal package you install as a black box. Running its CLI *copies* each component's real source code directly into `src/components/ui/` in this repo — so `src/components/ui/button.tsx` is a real file you can open, read, and edit, not something hidden inside `node_modules`. That's a deliberate design choice by shadcn/ui itself ("Open Code"): you own the code, and it's expected to plug into a project's *own* color tokens rather than bring its own.

That's exactly why it fits here: every component's classes (`bg-primary`, `border-border`, `text-muted-foreground`, …) already reference the same token names `tokens.css` and `presets.ts` define. No component-level styling work was needed to make a shadcn button, badge, or dialog already work correctly under all 5 presets and both color modes — it inherits them automatically, the same way any other `bg-primary` usage in the app does (see `STYLING-SYSTEM.md`'s explanation of the `@theme inline` mechanism for exactly how that works).

## The engine choice: Radix UI

The shadcn CLI installed here (`shadcn@4.21.0`) is newer than most guides describe. Before generating any component, it asks which accessibility engine should power it:

| Choice | What it is |
|---|---|
| **Radix UI** (chosen) | The long-established option — most mature, most documented, most examples. Also what the shadcn MCP server (already configured for this project, see `docs/BUILD-LOG.md`'s Step 1 entry) defaults to. |
| Base | shadcn's own newer, in-house primitives. Newer, less battle-tested, fewer examples if something needs debugging. |
| React Aria | Adobe's accessibility library. Solid, but a different registry than what the MCP server uses. |

Radix was picked so the CLI and the MCP server stay in agreement about where components come from, and so debugging later has the largest body of existing examples to draw on. This shows up in `components.json` as `"style": "radix-nova"` and in every generated component's imports (`import { Dialog as DialogPrimitive } from "radix-ui"`, etc.).

## New tokens this step added

Ten components needed a handful of colors the Step 4/5 token set didn't have yet: `popover`, `secondary`, `input`, and `destructive`. Rather than inventing four more brand colors to hand-tune per preset, each was mapped to something that already exists, directly in `src/app/globals.css`'s `@theme inline` block:

```css
--color-popover: var(--card);              /* a popover is just a raised surface, like a card */
--color-secondary: var(--accent);          /* a secondary surface is a soft one, like accent */
--color-input: var(--border);              /* an input's border is, well, a border */
--color-destructive: var(--status-absent); /* danger means the same thing everywhere, like status colors */
```

`--destructive-foreground` (the text color for a *solid* destructive fill) is the one genuinely new literal value, since nothing existing fit — it lives in `src/styles/tokens.css`, next to the status colors, for the same reason they're fixed rather than themed: CLAUDE.md groups "destructive actions" with the status colors explicitly ("keep the same meaning in every theme").

**Why aliasing instead of extending every preset:** `--card`, `--accent`, `--border`, and `--status-absent` already vary correctly per preset and per color mode (that's the whole point of Step 5). Pointing `--popover` at `--card` means a popover automatically matches whichever preset and mode is currently active, with zero new preset data, zero new AA tests to maintain, and zero risk of the two drifting apart later.

## A build hazard worth knowing about: `shadcn init` isn't blank-slate safe

Running `npx shadcn@latest init` on a project that *already* has its own token system (like this one, since Step 4) doesn't detect and respect the existing tokens — it appends its own generic, ungrouped `:root`/`.dark` color blocks (flat greys, unrelated to any brand), its own font, and its own radius scale, all of which would have silently outranked or duplicated the real ones through ordinary CSS cascade rules. This was caught by diffing `git status`/`git diff` immediately after running `init`, before adding any components, and manually removing everything that conflicted — full story, including exactly what was reverted, in `docs/BUILD-LOG.md`'s Step 6 entry. **The lesson for next time:** never trust `init`/scaffold-type commands to be additive-only on a project with existing conventions; always diff immediately after running one.

## The three shared components

Per CLAUDE.md's code structure (`src/components/` = "shadcn primitives" in `ui/` + "shared composed components" beside it):

- **`StatusPill`** (`src/components/status-pill.tsx`) — a small pill for one of the four attendance states (`present` / `late` / `absent` / `idle`). Built only on the fixed status tokens, never a preset color, since a status must mean the same thing under every theme.
- **`EmptyState`** (`src/components/empty-state.tsx`) — an icon (any `lucide-react` icon), a title, an optional description, and an optional action button. For empty lists and empty search results in later steps.
- **`PageHeader`** (`src/components/page-header.tsx`) — a title, an optional description, and an optional right-aligned actions slot, for consistent page tops in later steps.

Each has its own test (`*.test.tsx`) in Testing Library, matching the convention already used by `src/app/page.test.tsx`.

## School logos: upload and render (Step 25)

Phase 1 has no file storage, so a logo travels as a **data URL** (a text string that *is* the image, produced by `FileReader.readAsDataURL`) inside the form values and lands on the school record's `logoUrl`. Three feature-local pieces plus one shared change make the whole loop work:

- **`LogoUploader`** (`src/features/schools/logo-uploader.tsx`) — a visually hidden `<input type="file" accept="image/*">` behind a button-styled `<label>` (`Button asChild`), reading the picked file to a data URL and handing it up through `onChange`. Client checks (image type, 1 MB cap — `MAX_LOGO_BYTES`) report through `onInvalid`; the schema re-checks size server-side with `z.url().max(1_500_000)` (1 MB binary ≈ 1.4 M base64 characters). The input's value is reset after each change so picking the same file again still fires.
- **`SchoolLogo`** (`src/features/schools/school-logo.tsx`) — the one place that renders a school's brand mark outside the sidebar: the uploaded logo via `next/image`, or a two-letter initials monogram (`bg-primary text-primary-foreground`). Next detects `data:` sources and serves them unoptimized automatically (`node_modules/next/dist/shared/lib/get-img-props.js`), so `next/image` stays correct here; the image is decorative (`alt=""`) because the school name always sits beside it.
- **`SidebarBrand`** (`src/components/app-shell/sidebar.tsx`) — the same logo-or-icon-badge choice inline in the shell, so a school with a logo sees it everywhere it identifies itself.

**One Sheet behavior worth knowing** (it silently shapes every drawer in the app): the sheet base in `src/components/ui/sheet.tsx` sizes itself with `data-[side=right]:w-3/4` and `data-[side=right]:sm:max-w-sm`. Those attribute-variant utilities outrank any plain `w-full`/`sm:max-w-lg` a caller passes — tailwind-merge treats them as different modifier groups, and the attribute selector wins on specificity. So every drawer (staff included) renders ¾ of the screen on a phone and 384px on desktop. If a full-width mobile drawer or a wider drawer is ever wanted, change it once in `sheet.tsx` — not per drawer.

## Where to see all of this today

`src/app/page.tsx`'s "Components (Step 6)" section shows one example of every new primitive and shared component, so it can be checked in a browser under every preset (`?preset=ocean`, etc.) and both color modes. This is explicitly **not** the real style guide — Step 7 builds a dedicated, dev-only `/design-system` page showing every token, component, and state properly, with a `check:tokens` script enforcing the no-raw-colors rule. Today's section on the demo page is scaffolding, the same way Step 5's `?preset=` links are.

**One known limitation of today's scaffolding, not the real system:** the `?preset=` preview only recolors content actually inside the demo page's own wrapper `<div>`. Radix renders dialogs, sheets, dropdown menus, and select popups through a portal — a separate branch of the page, outside that wrapper — so previewing, say, Crimson still shows those specific popups in the School preset's colors. This does **not** affect the real theming system (`ThemePresetStyle`, wired into `layout.tsx`), which sets colors at the document root and reaches portaled content correctly — it's purely a gap in the temporary preview link, which Step 11's real theme switcher replaces anyway.

## Interactive companion

[Talaan Theme Layers](https://claude.ai/artifact/HWXYY2M2GwdxXAkY9djNwy) (also linked from `STYLING-SYSTEM.md`) covers the color/override mechanism these components sit on top of, if that part needs a refresher.
