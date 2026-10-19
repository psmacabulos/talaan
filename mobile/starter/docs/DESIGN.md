# Design

## The owner's design comes first

The owner supplies the app's UI design in `design/` (screens, a Figma link, images, or a prototype). It's the reference for layout, hierarchy, look and behaviour. Read it before building any screen, and say which part of it a screen follows.

- **Match its intent, not its literal pixels.** Check each screen on a small phone (360 points wide) and a large one, in light and dark. If a block that works on a large screen crowds a small one, say so and propose what to do.
- **Where the design says nothing** (a loading state, an error, dark mode, a screen it doesn't show), use the defaults below and the UX quality bar in `CLAUDE.md`, and tell the owner what you chose.
- **When the design breaks a rule below** (a colour that fails contrast, a status colour used for something else, a touch target under 44 points), don't copy it silently. Say what conflicts and propose the closest version that passes.
- If `design/` is empty, ask the owner before building a screen. M1's single screen can use the defaults below.

## Rules that hold whatever the design says

1. **Tokens, never literals.** Every colour, font size, space and corner lives in `src/theme` (for example `src/theme/tokens.ts`), with light and dark values. Components use token names only: no hex, `rgb()` or named colours in components or screens. Add a lint rule or a small script that fails on a colour literal outside `src/theme`, and run it in CI.
2. **Status colours mean one thing.** Present or time in (green), late (amber), absent (red), not yet tapped (grey) and time out (blue) keep the same meaning everywhere, are never themed, and are never reused for anything else (brand green is not "present").
3. **Colour never carries meaning alone.** A status is a pill with its words ("Present", "Came in") on its colour.
4. **WCAG AA contrast:** 4.5:1 for text, 3:1 for large text and icons. Check every token pair in a unit test.
5. **Touch targets** at least 44 × 44 points, and 48 on Android.
6. **Respect the phone:** light and dark follow its setting; font scaling is never turned off (layouts grow with large text); no motion when it asks for reduced motion. Motion is short (100–300 ms) and purposeful.
7. **The name is Bantay Aral,** on the sign-in screen, the app icon, the splash screen and every notification.

## Defaults, from the web app

These are Talaan's default theme, converted from its `src/styles/tokens.css` (OKLCH) to hex on 2026-10-13. Use them where the owner's design doesn't give its own values, so the app and the web portal look like one product.

### Colours

| Token | Light | Dark | Used for |
|---|---|---|---|
| `background` | `#F4F7FB` | `#0D1526` | screen background |
| `foreground` | `#12213F` | `#E9EFFA` | main text |
| `card` | `#FFFFFF` | `#141F36` | cards and sheets |
| `primary` | `#223060` | `#60A0C0` | main buttons, the brand |
| `primaryForeground` | `#FFFFFF` | `#08111F` | text on `primary` |
| `link` | `#1B77A5` | `#82B4CE` | links |
| `highlight` | `#F9E322` | `#F9E322` | the brand's yellow, used sparingly |
| `muted` | `#E8EEF6` | `#1E2B45` | quiet surfaces |
| `mutedForeground` | `#5B6B84` | `#9BABC6` | secondary text |
| `border` | `#DFE6F0` | `#243250` | dividers, card edges |
| `destructive` | `#B92A32` | `#FF8B91` | sign out, delete |

### Status colours (fixed, never themed)

| Status | Text, light | Background, light | Text, dark | Background, dark |
|---|---|---|---|---|
| present, time in (green) | `#157A45` | `#E2F5EA` | `#5EDB98` | `#12382A` |
| late (amber) | `#8A5A00` | `#FFF0C7` | `#FFD166` | `#3A2E10` |
| absent (red) | `#B92A32` | `#FDE6E7` | `#FF8B91` | `#40191C` |
| not yet tapped (grey) | `#52627C` | `#E8EEF6` | `#A9B7CE` | `#1E2B45` |
| time out (blue) | `#2058D4` | `#E7F2FF` | `#88BCFF` | `#182B4F` |

### Brand colours (the logo; the same at every school)

| Token | Light | Dark | Used for |
|---|---|---|---|
| `brandParentTop` | `#2F80D0` | `#FFFFFF` | the parent's head, the top of the figure |
| `brandParent` | `#1149A6` | `#C9D6EA` | the bottom of the parent figure |
| `brandChild` | `#2FA866` | `#2FA866` | the child, and the right page |
| `brandPageLight` | `#6CC896` | `#6CC896` | the left page |
| `brandPageDeep` | `#126A5C` | `#3FA57A` | the book's lower edge |
| `brandEdge` | `#FFFFFF` | `#0D1526` | the page lines (the background behind the logo) |
| `brandSun` | `#F8B014` | `#F8B014` | the sun's rays |
| `brandInk` | `#0A2552` | `#E9EFFA` | "Bantay" in the wordmark |
| `brandGreenText` | `#1A7F48` | `#4CC98A` | "Aral", and any green text (4.7:1 and 8.7:1) |

The logo's own green (`brandChild`) is too light for text, so text uses `brandGreenText`.

### Type, space, corners

- **Fonts:** Lexend for headings and every number and time; Atkinson Hyperlegible for everything else.
- **Type scale:** 12, 14, 16, 18, 22 and 28. Never a one-off size.
- **Space:** a 4-point scale: 4, 8, 12, 16, 20, 24, 32, 40, 48.
- **Corners:** 6, 8, 10 and 14.
- **The look:** calm and clear, like the web app. White cards on a pale background, the child's photo large, one clear status. The gate's tap card is the web app's reference: photo, name, "Grade 7 – Rizal", a status pill, and the time in large digits.

## The logo

`reference/mark-shapes.ts` holds the Bantay Aral mark as vector data (a parent holding a child over an open book, with the sun's rays), with its light and dark colours. Draw it with `react-native-svg`; never use a screenshot of it.

- **The wordmark** is "Bantay" plus "Aral", joined, in Lexend Bold: "Bantay" in `brandInk`, "Aral" in `brandGreenText`. Screen readers hear "Bantay Aral" (one label on the whole logo; the mark itself is decorative).
- **The tagline,** where there's room: "Every school day, connected with care."
- **The app icon and splash screen** are the mark on white (`#FFFFFF`), generated from the same shapes (`markSvgMarkup` gives a standalone SVG to render into PNGs).
- If the owner's design includes its own logo files, use those, and check they match these shapes.
