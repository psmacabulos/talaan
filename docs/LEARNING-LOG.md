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
