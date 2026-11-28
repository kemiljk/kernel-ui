# @kernelui-lib/cli

Integration CLI for [Kernel UI](https://www.kernelui.com).

## Install

```bash
npm install -D @kernelui-lib/cli
# or run once without installing:
npx @kernelui-lib/cli init
```

## Commands

### `kernel init`

Installs `@kernelui-lib/react` and `@kernelui-lib/styles`, then wires up the required CSS imports for Vite or Next.js projects.

```bash
kernel init
kernel init --tailwind --accent blue
kernel init --tokens-only
kernel init --dry-run
```

### `kernel doctor`

Checks that Kernel packages, styles imports, and React version look correct. Flags shadcn/Radix dependencies and points to the migration guide.

```bash
kernel doctor
kernel doctor --path ./apps/web
```

### `kernel docs`

Looks up component metadata from the local registry — useful for agents and offline development.

```bash
kernel docs
kernel docs text-field --json
kernel docs dialog --markdown
kernel docs input
```

### `kernel mcp`

Runs a Model Context Protocol server over stdio so coding agents can look Kernel up: `list_components`, `search_components`, `get_component` (exact props, attributes, events), `get_tokens`, `get_conventions` and `check_code`. Answers come from data bundled into the CLI, so they work offline and match the installed version.

```bash
kernel mcp init                  # Claude Code (.mcp.json)
kernel mcp init --client cursor  # .cursor/mcp.json
kernel mcp init --client vscode  # .vscode/mcp.json
```

### `kernel check`

Reviews files for common Kernel mistakes (foreign props such as `asChild`, invalid values, missing labels, unlabelled icon-only buttons, clickable divs, raw colours, hand-picked radii, replaceable shadcn/Radix imports). Exits non-zero on errors.

```bash
kernel check src/App.tsx
```

## LLM usage

- Package maps ship with `@kernelui-lib/react` and `@kernelui-lib/elements` as `llms.txt`.
- The docs site publishes `/llms.txt`, `/llms-full.txt`, and `/registry.json`.
- `kernel docs <component> --json` returns structured metadata including shadcn aliases and migration caveats.

## License

MIT
