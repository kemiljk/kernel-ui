# Vite + React smoke test

Minimal consumer app that installs **published** `@kernelui-lib/*` packages from npm (not the monorepo workspace). Use this after a release to confirm install, CSS, and components work outside the docs site.

```bash
cd examples/vite-react-smoke
npm install
npm run build
npm run dev   # optional: open http://localhost:5173
```

If `npm install` returns 404 for a brand-new scope, wait a few minutes for registry propagation, or install tarballs directly:

```bash
npm install @kernelui-lib/react@1.0.0 @kernelui-lib/styles@1.0.0
```

Expected: production build completes with Kernel styles bundled (~100kb CSS) and no TypeScript errors.
