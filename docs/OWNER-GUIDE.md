# Owner guide (for you, not for Claude)

## One-time: create the repository
1. On github.com click **New repository**. Name it `talaan`, choose **Private**, and leave README, .gitignore and license **unchecked**. Click Create.
2. Copy the repository address (the HTTPS link).
3. In VS Code open the Command Palette (Ctrl+Shift+P, or Cmd+Shift+P on Mac), run **Git: Clone**, paste the address, and choose where to save it. Sign in to GitHub if VS Code asks.
4. Unzip `talaan-starter.zip` and copy everything inside its `talaan` folder into the cloned folder (include the hidden `.claude` folder).
5. Open the cloned folder in VS Code. In the **Source Control** panel you will see the new files. Type the message `chore: add project brief and design reference`, click **Commit**, then **Sync Changes** (or Push). This is commit 0.

## Every step
1. In the Claude panel, in **Plan** mode, say: `Do the next step.`
2. Read the plan. Approve it, or tell Claude what to change.
3. Claude builds it and sends a review report.
4. Check it: run the command it gives you (usually `npm run dev`), open the link, and follow "what to look for".
5. Not right? Tell Claude what to fix. Right? Say `approved`. Claude then ticks the box and updates the progress bar in `docs/PLAN.md`.
6. Commit: open **Source Control**, look through the changed files, paste the suggested commit message, click **Commit**, then **Sync Changes**.

## Good to know
- Progress is at the top of `docs/PLAN.md`. `npm run progress` refreshes it.
- Claude cannot run git. This is enforced in `.claude/settings.json`. In the Claude panel, type `/permissions` to see the blocked commands. Your commit history should contain only your commits.
- Unhappy with a change? Hover over a message in the Claude panel and use the rewind button to go back.
- One step per commit keeps the history readable: `git log` will read like the plan.
