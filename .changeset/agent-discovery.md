---
"@kernelui-lib/cli": patch
---

Prepare the CLI's MCP server for the official MCP Registry. This adds `mcpName` (`io.github.kemiljk/kernel-ui`) and a `server.json`, whose version the build keeps in sync with `package.json`. The package description and keywords now mention the MCP server.

`kernel mcp init --client codex` (and `kernel agents --client codex`) writes the server to `.codex/config.toml`, replacing only its own `[mcp_servers.kernel]` table.
