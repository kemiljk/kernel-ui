---
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
"@kernelui-lib/cli": minor
---

Ship agent skills with the packages, and add `kernel agents`.

- `@kernelui-lib/react` now includes `skills/kernel-ui`, `skills/kernel-ui-theming` and `skills/kernel-ui-migrate`. `@kernelui-lib/elements` includes `skills/kernel-ui-elements`. They use the Agent Skills format (`SKILL.md`), are versioned with the code, and carry the `tanstack-intent` keyword.
- `kernel agents` installs those skills into `.claude/skills` (or `--dir`), preferring the installed packages' copies. It registers the MCP server (`--client`), and adds a Kernel UI section to `AGENTS.md`, and to `CLAUDE.md` if present. Running it again replaces that section rather than duplicating it.
- Fix: `kernel mcp init` no longer reads an unrelated flag as the client name.
