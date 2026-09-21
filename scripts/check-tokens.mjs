// Fails if a raw color literal (hex/rgb/hsl/oklch) or a Tailwind default
// palette class (bg-blue-500, text-emerald-600, ...) shows up in app source
// outside the files that are allowed to define what a theme's colors
// actually are. See CLAUDE.md's design-system rule 7 and
// docs/STYLING-SYSTEM.md: every color in the app is supposed to trace back
// to exactly one named token (src/styles/tokens.css, src/lib/theme/presets.ts),
// so a school's theme preset (or dark mode) can recolor everything with zero
// component changes. A hardcoded color anywhere else would stay stuck
// forever, in every other theme.
// Run with: npm run check:tokens   (or: node scripts/check-tokens.mjs)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC_DIR = path.join(ROOT, 'src');

// The only place real color values are allowed to be defined.
const ALLOWED_DIRS = [path.join(SRC_DIR, 'lib', 'theme'), path.join(SRC_DIR, 'styles')];

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.js', '.mjs']);

const COLOR_FUNCTIONS = ['rgb', 'rgba', 'hsl', 'hsla', 'oklch', 'oklab', 'lab', 'lch'];
const TAILWIND_PALETTES = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];
const TAILWIND_COLOR_PREFIXES = [
  'bg', 'text', 'border', 'ring', 'fill', 'stroke', 'from', 'via', 'to',
  'outline', 'accent', 'caret', 'decoration', 'divide', 'shadow', 'placeholder',
];

// A hex color: # followed only by hex digits, 3-8 of them (#fff, #223060,
// #223060ff). A word boundary after keeps this from matching a run of hex
// digits that's actually part of something longer.
const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/g;

// A color function called with a literal argument (a digit or a decimal
// point right after the paren) — not `color-mix(in oklch, ...)`, which
// never has "(" immediately after the color-space name.
const COLOR_FUNCTION_CALL = new RegExp(`\\b(?:${COLOR_FUNCTIONS.join('|')})\\(\\s*[\\d.]`, 'g');

const TAILWIND_PALETTE_CLASS = new RegExp(
  `\\b(?:${TAILWIND_COLOR_PREFIXES.join('|')})-(?:${TAILWIND_PALETTES.join('|')})-(?:50|100|200|300|400|500|600|700|800|900|950)\\b`,
  'g',
);

// CLAUDE.md's actual rule is "no raw colors... in components or pages" — a
// domain schema can legitimately validate a color as plain data (Step 8's
// School.theme "custom" brand color, supplied by a school and stored as a
// hex string, is exactly this: real data, not a hardcoded styling choice).
// schemas.ts / schemas.test.ts files never render anything, so they're
// exempt the same way the theme files are.
const ALLOWED_FILENAME_PATTERN = /[/\\]schemas(\.test)?\.ts$/;

function isAllowed(filePath) {
  return (
    ALLOWED_DIRS.some((dir) => filePath.startsWith(dir + path.sep)) ||
    ALLOWED_FILENAME_PATTERN.test(filePath)
  );
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (SCAN_EXTENSIONS.has(path.extname(full))) {
      files.push(full);
    }
  }
  return files;
}

const violations = [];

for (const file of walk(SRC_DIR)) {
  if (isAllowed(file)) continue;
  const relative = path.relative(ROOT, file);
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    for (const pattern of [HEX_COLOR, COLOR_FUNCTION_CALL, TAILWIND_PALETTE_CLASS]) {
      for (const match of line.matchAll(pattern)) {
        violations.push({ file: relative, line: index + 1, found: match[0], text: line.trim() });
      }
    }
  });
}

if (violations.length > 0) {
  console.error(`check:tokens found ${violations.length} raw color(s) outside the theme files:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  (${v.found})\n    ${v.text}`);
  }
  console.error(
    '\nColors must be one of the named tokens in src/styles/tokens.css or src/lib/theme/presets.ts — see docs/STYLING-SYSTEM.md.',
  );
  process.exit(1);
}

console.log('check:tokens: no raw colors found outside the theme files.');
