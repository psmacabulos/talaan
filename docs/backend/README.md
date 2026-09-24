# How Phase 2 works

Phase 1 (the front end) was built by Claude, step by step, with the owner reviewing and approving each one. Phase 2 (the back end — real database, real auth, the tap API) flips that: **the owner writes every line of backend code personally**, to actually learn backend development, not just watch it happen. Claude's job changes from "build it" to "teach it."

## What Claude does for each step

Claude writes one recipe file here: `docs/backend/step-NN-<name>.md`, using the same step numbers as `docs/PLAN.md` (Phase 1 ended at Step 29, so backend steps start at Step 30). A recipe is not a summary — it's the actual lesson, written before the code exists, containing:

1. **Why** — what problem this step solves and how it fits into the bigger picture, in plain language.
2. **What you'll need** — any tool or account to have ready first.
3. **Steps** — numbered, in order. Each one is either a command to run or a file to create/edit, with the exact text to type or paste, and a short "why this line" for anything non-obvious.
4. **Verify it worked** — an exact command or action with the output you should see.
5. **If something goes wrong** — the errors a beginner is likely to hit at this exact step, and the fix.
6. **What you just learned** — a short recap of the concept, so it sticks.

## What the owner does

1. Open the recipe file for the current step.
2. Type or paste each piece into your terminal/editor, in order — reading as you go, not just pasting blindly.
3. Run the "Verify it worked" check.
4. Tell Claude what happened: it worked, or here's the exact error/output.
5. If something's wrong, Claude helps you fix it (still by explaining what to change, not by editing the files itself) — you make the edit, then re-verify.
6. Once it works, say "approved" — same as Phase 1. Claude ticks the step's boxes in `docs/PLAN.md`, updates `docs/BUILD-LOG.md` and `docs/LEARNING-LOG.md` from what actually happened (including any error you hit and how it got fixed), and tells you it's ready to commit. You commit it, same as every Phase 1 step.

This is the same rhythm as Phase 1's step protocol in `CLAUDE.md` — plan, do the work, verify, review, approve, commit — just with you as the one typing instead of Claude.

## A few things this changes

- **Claude does not edit backend source files, `.env`, `schema.prisma`, or run backend commands on your behalf for a Phase 2 step.** It can still read files back (with your OK) to check your work, and it still writes and updates docs, `docs/PLAN.md`, and non-code project files as it always has.
- **`docs/recipes/`** (Phase 1's retrospective, "here's exactly what I built" checklists) doesn't get a new entry per backend step — the files in this folder already are the recipe, written before the code exists instead of after. `docs/BUILD-LOG.md` and `docs/LEARNING-LOG.md` still get updated as before.
- **Steps are smaller than Phase 1's.** Phase 1 steps often bundled several related tasks into one commit. Backend steps are one idea at a time — installing a tool, defining one model, writing one migration — so each recipe is short enough to fully understand before moving to the next.
- Only the current step is written out in full in `docs/PLAN.md`. The rest of Phase 2 stays a rough, one-line-per-step roadmap until we actually get there — writing a detailed recipe for something Auth.js-related today, before we've even connected a database, would mean guessing at details that are likely to change.

## Roadmap so far

See the "Phase 2: back end" section of `docs/PLAN.md` for the current list of steps and which one is next.
