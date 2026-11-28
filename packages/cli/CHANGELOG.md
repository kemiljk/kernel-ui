# @kernelui-lib/cli

## 1.1.1

### Patch Changes

- ec6b2b7: Agent docs and the MCP server cover what agents got wrong in the evals.
  
  - **MCP `get_component`** for elements now lists every event a tag dispatches with the exact `event.detail` type, read from source with the type checker (`kernel-file-upload-error`: `{ type: "max-files" | "max-size" | "accept" | "directory"; files: File[] }`, `<kernel-tag-input>`'s `change`: `{ tags: string[] }`), and plain events as having no detail. When the registry records which ARIA attributes a tag forwards to its native control, it lists those too.
  - **Elements skill and `llms.txt`**: a file upload recipe (show `kernel-file-upload-error` through `invalid`/`error-message`, clear it on the host's `change`, which fires only for accepted selections), accessible names set on the tag and forwarded to the control, `<kernel-switch>` named by its text or `aria-label`, and `id` staying on the tag.
  - **React and elements skills**: a page needs one `<h1>`, which no component renders.
- 7468dfd: Build scripts only, with no runtime change: these packages build the shared registry through `packages/registry/scripts/build-once.mjs`, so parallel builds no longer overwrite each other's output.
- 1397dfd: Add two AI components, each in both packages. `StreamingMarkdown` (`<kernel-streaming-markdown>`) renders model Markdown as real elements while it streams: a built-in, dependency-free parser (paragraphs, headings, emphasis, inline and fenced code via `CodeBlock`, nested lists, blockquotes, safe links, GFM tables, rules) that never produces HTML, re-renders only the last block per chunk, renders unfinished syntax as its finished form, and fades new words in on the motion tokens. `ModelPicker` (`<kernel-model-picker>`) is a compact pill for a composer toolbar that opens a popover listbox of models with provider groups, descriptions, badges, icons, disabled options and typeahead. Also exports `parseMarkdown` and `safeHref` from both packages. The CLI's bundled registry lists both components.

## 1.1.0

### Minor Changes

- 1208682: Add `kernel mcp` and `kernel check`.
  
  - `kernel mcp` runs a Model Context Protocol server over stdio. Its tools are `list_components`, `search_components`, `get_component`, `get_tokens`, `get_conventions` and `check_code`. `get_component` returns exact props, attributes and events generated from source. Everything is bundled into the CLI, so answers work offline and match the installed version. The server has no runtime dependencies.
  - `kernel mcp init --client claude|cursor|vscode` registers the server in a project's MCP config, merging with any servers already there.
  - `kernel check <files…>` reviews code for common Kernel mistakes and exits non-zero on errors: foreign props, invalid values, missing labels, unlabelled icon-only buttons, clickable divs, raw colours, hand-picked radii, and replaceable shadcn/Radix imports.
- 2547241: Ship agent skills with the packages, and add `kernel agents`.
  
  - `@kernelui-lib/react` now includes `skills/kernel-ui`, `skills/kernel-ui-theming` and `skills/kernel-ui-migrate`. `@kernelui-lib/elements` includes `skills/kernel-ui-elements`. They use the Agent Skills format (`SKILL.md`), are versioned with the code, and carry the `tanstack-intent` keyword.
  - `kernel agents` installs those skills into `.claude/skills` (or `--dir`), preferring the installed packages' copies. It registers the MCP server (`--client`), and adds a Kernel UI section to `AGENTS.md`, and to `CLAUDE.md` if present. Running it again replaces that section rather than duplicating it.
  - Fix: `kernel mcp init` no longer reads an unrelated flag as the client name.

### Patch Changes

- 1451d39: Prepare the CLI's MCP server for the official MCP Registry. This adds `mcpName` (`io.github.kemiljk/kernel-ui`) and a `server.json`, whose version the build keeps in sync with `package.json`. The package description and keywords now mention the MCP server.
  
  `kernel mcp init --client codex` (and `kernel agents --client codex`) writes the server to `.codex/config.toml`, replacing only its own `[mcp_servers.kernel]` table.

## 1.0.5

### Patch Changes

- Update development dependencies: Vite 8.3.5, `@testing-library/user-event` 14.6.8 and Node.js 26.6.5 types.
- da1063a: Update the package build dependencies to Vite 8.3 and Node.js 26.6 types.

## 1.0.4

### Patch Changes

- 629fa4e: Update development dependencies for React component tests and CLI typechecking.

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
