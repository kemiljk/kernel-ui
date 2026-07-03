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

CI runs on pull requests (typecheck, tests, package builds, and a docs build). Pushes to `master` deploy via **Vercel**. You will see a `Production - kernel-ui` check from the Vercel GitHub app. That is the production build, not a duplicate Actions workflow.

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

### Using AI tools

Using an LLM to explore the codebase, draft a patch, or write tests is welcome. Drive-by, untested spam is not: bulk-generated PRs with no context, no review, and no author accountability do not help.

Every contribution needs a human who can explain the change and stand behind it.

### Component conventions

See [AGENTS.md](./AGENTS.md) for the full implementation guide. The essentials:

- Add every new component to **both** `packages/react` and `packages/elements`.
- Use design tokens from `@kernelui-lib/styles`; do not hardcode colours or spacing.
- Prefer native HTML elements and document the accessibility tradeoff in the component JSDoc.
- Add docs: entry in `apps/docs/src/data/components.ts`, page, demo, and playground.

### Versioning

We use [Changesets](https://github.com/changesets/changesets). Add a changeset when your PR should trigger a release:

```bash
bun run changeset
```

### Code of conduct

Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
