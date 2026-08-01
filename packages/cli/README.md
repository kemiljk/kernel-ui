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

## LLM usage

- Package maps ship with `@kernelui-lib/react` and `@kernelui-lib/elements` as `llms.txt`.
- The docs site publishes `/llms.txt`, `/llms-full.txt`, and `/registry.json`.
- `kernel docs <component> --json` returns structured metadata including shadcn aliases and migration caveats.

## License

MIT
