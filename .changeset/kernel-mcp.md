---
"@kernelui-lib/cli": minor
---

Add `kernel mcp` and `kernel check`.

- `kernel mcp` runs a Model Context Protocol server over stdio. Its tools are `list_components`, `search_components`, `get_component`, `get_tokens`, `get_conventions` and `check_code`. `get_component` returns exact props, attributes and events generated from source. Everything is bundled into the CLI, so answers work offline and match the installed version. The server has no runtime dependencies.
- `kernel mcp init --client claude|cursor|vscode` registers the server in a project's MCP config, merging with any servers already there.
- `kernel check <files…>` reviews code for common Kernel mistakes and exits non-zero on errors: foreign props, invalid values, missing labels, unlabelled icon-only buttons, clickable divs, raw colours, hand-picked radii, and replaceable shadcn/Radix imports.
