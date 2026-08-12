# Kernel

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A component library built on the actual kernel of the web: real semantic HTML elements, not div soup.

**Documentation:** [kernelui.com](https://www.kernelui.com/) · **GitHub:** [kemiljk/kernel-ui](https://github.com/kemiljk/kernel-ui)

## Packages

| Package | Description |
| --- | --- |
| [`@kernelui-lib/react`](https://www.npmjs.com/package/@kernelui-lib/react) | React components on real semantic HTML |
| [`@kernelui-lib/elements`](https://www.npmjs.com/package/@kernelui-lib/elements) | The same design as framework-free Custom Elements |
| [`@kernelui-lib/cli`](https://www.npmjs.com/package/@kernelui-lib/cli) | Integration CLI — init, doctor, and local component lookup |
| [`@kernelui-lib/styles`](https://www.npmjs.com/package/@kernelui-lib/styles) | Design tokens, reset, and Tailwind v4 bridge |

## Quick start (React)

```bash
npx @kernelui-lib/cli init
```

Or install manually:

```bash
npm install @kernelui-lib/react @kernelui-lib/styles
```

```tsx
import "@kernelui-lib/styles";
import "@kernelui-lib/react/styles.css";

import { Button } from "@kernelui-lib/react";

export function App() {
  return <Button variant="primary">Save changes</Button>;
}
```

### Web Components

```bash
npm install @kernelui-lib/elements @kernelui-lib/styles
```

```html
<script type="module">
  import "@kernelui-lib/elements";
</script>

<kernel-button variant="primary">Save changes</kernel-button>
```

See the [installation guide](https://www.kernelui.com/installation/) and [platforms overview](https://www.kernelui.com/platforms/) for framework-specific notes.

## Developing

This monorepo uses **Bun** for installs and scripts (`bun.lock`).

```bash
bun install
bun run dev
```

The docs site runs at `http://localhost:4321`.

```bash
bun run build          # build all @kernelui-lib/* packages
bun run typecheck      # typecheck workspace
bun run test           # run React package tests
bun run docs:build     # build docs site
```

See [`AGENTS.md`](./AGENTS.md) and [`CONTRIBUTING.md`](./CONTRIBUTING.md) for conventions and contribution workflow.

## Releases

Releases are automated with Changesets via [`.github/workflows/release.yml`](.github/workflows/release.yml).

- On every push to `main`, the workflow will either:
  - open/update a `Version Packages` pull request with version bumps and changelogs, or
  - publish to npm and create GitHub Releases when a version PR has just been merged.
- Publishing requires a repository secret named `NPM_TOKEN` with publish access to the `@kernelui-lib/*` packages.
- Version bumps are driven by `.changeset/*.md` files. Include one with package-impacting PRs so the next release increments versions automatically.

## Status

53 components are documented and available today across React and Custom Elements. Browse the [component catalog](https://www.kernelui.com/components/).

## License

MIT © Karl Koch
