# Learning log

Short, plain-language notes explaining things along the way — for whenever I want a reminder later. Newest entries at the bottom.

## Moving files in Bash (`mv`)
`mv <source> <destination>` moves or renames a file/folder. `./` as the destination means "the current folder."

To move only *some* files out of a folder (and skip others), list each one by name instead of using a wildcard:
```bash
mv tempo/talaan/package.json ./
mv tempo/talaan/src ./
```
A wildcard (`mv tempo/talaan/* ./`) moves *everything*, which is risky if you need to skip a few files — like the generated `CLAUDE.md` we didn't want to overwrite, or `node_modules`, which is better reinstalled fresh. Also, `*` alone doesn't match dotfiles (like `.gitignore`) — that needs a separate pattern: `.[!.]* `.

Delete a folder (and everything in it) with `rm -rf <folder>`: `-r` = recursive (include subfolders), `-f` = don't ask for confirmation.

## Adding the shadcn MCP server
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

## Saving and quitting in vi/vim
Some git commands (like `git commit` typed without `-m "message"`) open a text editor for you to type the commit message — on many systems that's vi/vim, which doesn't work like a normal text editor.

To save and exit: press `Esc` first (makes sure you're not still "typing"), then type `:wq` and press Enter. `:q!` instead quits without saving, if you want to back out. This project shouldn't need it though — VS Code's Source Control panel handles commit messages without ever opening vi.

## Why a check can pass for Claude but fail in CI
This happened with `npm run typecheck`: it passed here, then failed as soon as it ran in GitHub Actions. The reason wasn't the workflow file — it was that Next.js generates some special files (type definitions, in a hidden `.next` folder) the first time you run `npm run dev` or `npm run build`. Locally, that folder already existed from earlier work, so the check quietly relied on it without anyone asking it to. GitHub Actions always starts from a completely empty, fresh copy of the repo — no `.next` folder, no leftovers — so anything that secretly depended on "stuff left over from before" gets exposed immediately.

This is actually the whole point of CI: it catches "works on my machine" bugs, because it never has "my machine's" leftover state to lean on. The fix was to make the `typecheck` script generate those files itself first (`next typegen`) instead of assuming they're already there.

## The "LF will be replaced by CRLF" warning, and `.gitattributes`
This is a Git thing, unrelated to `npm run build` or Next.js. Every text file has invisible line-ending characters: Linux/Mac tools (and virtually all coding tools, Claude included) write **LF**; Windows traditionally uses **CRLF** (one extra character per line). Windows Git has a setting, `core.autocrlf`, that's commonly on by default — it quietly converts between the two whenever files are added or checked out.

This warning was probably always happening, just invisible: committing through VS Code's Source Control panel runs the same Git commands under the hood, but doesn't show you their raw warning text. Once a commit was made directly in a terminal (`git commit`), Git's own output — warnings included — became visible for the first time.

Fixed with a `.gitattributes` file containing one line: `* text=auto eol=lf`. This tells Git explicitly "always use LF for text files," so there's no more mismatch to warn about, no matter whether the commit comes from the terminal or VS Code's panel.
