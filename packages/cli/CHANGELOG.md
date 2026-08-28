# @kernelui-lib/cli

## 1.0.3

### Patch Changes

- 92f832d: Update development tooling dependencies.

## 1.0.2

### Patch Changes

- bfc6ab3: Fix the bundled component catalog failing to load, which left every CLI
  lookup empty.

  `bundle-registry.mjs` wrote CommonJS into `dist/registry-bundle.js`, but the
  package is `"type": "module"`, so Node parsed that file as ESM and threw
  `ReferenceError: exports is not defined in ES module scope` on load. The
  bundle is now emitted as `dist/registry-bundle.cjs`, where the extension
  says what the contents actually are.

  The reason a completely unloadable catalog shipped as a passing build: the
  `require` was wrapped in a `try/catch` that substituted an empty registry on
  any error. The ReferenceError was swallowed, so `kernel docs <name>`,
  `kernel init`, and every other lookup silently found nothing instead of
  crashing. That fallback is gone — a missing catalog now throws at load with
  a message saying it's a packaging fault worth reporting.

## 1.0.1

### Patch Changes

- Remove workspace dependency on @kernelui-lib/registry and bundle registry data at build time so the CLI installs standalone from npm.
