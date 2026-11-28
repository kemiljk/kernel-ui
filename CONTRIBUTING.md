## Contributing to Kernel

Thanks for helping improve Kernel. This project ships every component twice: once as React (`@kernelui-lib/react`) and once as Custom Elements (`@kernelui-lib/elements`), with matching APIs and shared styles.

### Development setup

This monorepo uses **Bun workspaces** (`bun.lock` and the `workspaces` field in the root `package.json`). Do not add `pnpm-workspace.yaml` or other package-manager lockfiles.

```bash
bun install
bun run dev
```

The docs site runs at `http://localhost:4321`.

### Before opening a PR

CI runs on pull requests (typecheck, tests, package builds, and a docs build). Pushes to `main` deploy via **Vercel**. You will see a `Production - kernel-ui` check from the Vercel GitHub app. That is the production build, not a duplicate Actions workflow.

1. Build both component packages after changes:
   ```bash
   bun run --cwd packages/react build
   bun run --cwd packages/elements build
   ```
2. Run typechecks:
   ```bash
   bun run typecheck
   ```
3. Run tests:
   ```bash
   bun run test
   ```
4. If you changed docs content, run `bun run --cwd apps/docs typecheck`.

### Visual screenshots

`bun run test:screenshots` screenshots every component's live docs examples across a small theme matrix (light and dark, Sharp and Round radius, right-to-left, and a font whose metrics sit text low, which catches pill text drifting off-centre). Build the docs first (`bun run docs:build`).

```bash
bun run test:screenshots --update badge button      # save a baseline (before your change)
bun run test:screenshots badge button               # capture again and compare
bun run test:screenshots --list-variants            # see or pick variants with --variants=a,b
```

Output goes to `screenshots/` (gitignored): `current/`, `baseline/`, and `report/index.html` with baseline, current and diff side by side. Baselines are not committed, because font rendering differs between operating systems, so a baseline is only meaningful on the machine that made it. CI keeps its own Linux baseline from `main` and attaches each run's screenshots and report as a workflow artifact.

Captures are deterministic, so a diff means the UI changed. Every page runs on Playwright's fake clock, paused at a fixed date (in UTC, `en-US`) before the page loads, with `Math.random` seeded and smooth scrolling made instant. The suite waits for every example's island to hydrate, then runs the clock forward 10 seconds in steps, with network requests finishing and real frames rendering between steps. Demos that stream or step through states (StreamingMarkdown, ToolCall, Reasoning) are captured finished. Looping demos (Progress, CodeBlock, TodoList) land on the same frame every run, and DatePicker always marks the same "today". A demo that needs time to pass works as it is, with no special case for the suite. To check that a change hasn't made capture timing-sensitive, run the suite twice against one baseline, or add `--cpu-throttle=4` to simulate a slow machine.

The CI baseline cache is keyed on a hash of `scripts/screenshot-suite.mjs` as well as the `main` commit. If a PR changes the suite itself, it finds no baseline that matches and only captures, so new capture logic can't fail the PR with false diffs. The first push to `main` after it merges saves a new baseline.

### Using AI tools

Using an LLM to explore the codebase, draft a patch, or write tests is welcome. Drive-by, untested spam is not: bulk-generated PRs with no context, no review, and no author accountability do not help.

Every contribution needs a human who can explain the change and stand behind it.

### Component conventions

See [AGENTS.md](./AGENTS.md) for the full implementation guide. The essentials:

- Add every new component to **both** `packages/react` and `packages/elements`.
- Use design tokens from `@kernelui-lib/styles`; do not hardcode colours or spacing.
- Prefer native HTML elements and document the accessibility tradeoff in the component JSDoc.
- Add docs: entry in `packages/registry` (re-exported by `apps/docs/src/data/components.ts`), page, demo, and playground.

### Versioning

We use [Changesets](https://github.com/changesets/changesets). Add a changeset when your PR should trigger a release:

```bash
bun run changeset
```

### Code of conduct

Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
