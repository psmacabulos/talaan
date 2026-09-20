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
| `npm run progress`  | Regenerate the progress table at the top of `docs/PLAN.md` from its checkboxes. |

## Project guide

- [`docs/PLAN.md`](docs/PLAN.md) — the step-by-step build plan and progress tracker (a checklist).
- [`docs/BUILD-LOG.md`](docs/BUILD-LOG.md) — a detailed account of how each step was actually built: real commands, configuration choices, and how any problems were solved.
- [`docs/LEARNING-LOG.md`](docs/LEARNING-LOG.md) — short, plain-language notes explaining tools and commands along the way.
- [`docs/STYLING-SYSTEM.md`](docs/STYLING-SYSTEM.md) — how the design tokens, Tailwind, and dark mode actually work together, file by file, with diagrams.
- [`docs/OWNER-GUIDE.md`](docs/OWNER-GUIDE.md) — how the owner works with Claude on this project, step by step.
- [`CLAUDE.md`](CLAUDE.md) — the standing instructions Claude follows for this project (stack, design system, code structure, workflow rules).
