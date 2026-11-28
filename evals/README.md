# Agent evals

Fixed UI tasks that a coding agent builds with Kernel, each scored by
TypeScript, Kernel's ESLint plugin, a production build, axe-core in a real
browser and the task's own DOM assertions, with screenshots for a person to
look at. Use it to measure how well agents build with Kernel, and to catch
changes to Kernel's docs, skills, MCP server or lint rules that make agents
worse.

This is a development tool, not a published package.

## Running it

```bash
bun install                                   # links evals/template to the workspace packages
node evals/run.mjs --reference                # score the reference solutions; no model calls
node evals/run.mjs --dry-run                  # score the untouched template; a baseline
node evals/run.mjs --tasks confirm-dialog --model sonnet   # one task with Claude Code
node evals/run.mjs --agent codex --tasks confirm-dialog    # one task with Codex
bun run evals                                 # every task with Claude Code (see costs below)
```

The runner builds the workspace packages if a `dist` is missing. After
changing a package, pass `--build` so the evals don't score the old build.
Results go to `evals/results/<timestamp>/` (git-ignored): `results.json`,
an `index.html` report, and per task the screenshots, the prompt, the
agent's transcript and the files it left behind (`output/`).

| Option | What it does |
| --- | --- |
| `--tasks a,b` | Only these task ids. With `--reference`, the default is every task that has a reference. |
| `--agent "<cmd>"` | The agent command, run in the task's project directory. `{prompt}`, `{prompt_file}` and `{dir}` are replaced (shell-quoted); without `{prompt}` or `{prompt_file}` the prompt goes to stdin. `--agent codex` is shorthand for the Codex command below. |
| `--model <name>` | Model for the default Claude Code or Codex command. |
| `--budget <usd>` | `--max-budget-usd` per task for the default Claude Code command (default 3). |
| `--timeout <min>` | Time limit per task; the agent's whole process group is killed after it (default 15). |
| `--setup full\|none` | `full` (default) runs this checkout's `kernel agents` in the project: skills in `.claude/skills`, the `kernel` MCP server pointed at the workspace CLI build, and the Kernel section in `AGENTS.md`. `none` gives the agent only the installed packages, which tests whether it finds `llms.txt` and the types on its own. |
| `--client <name>` | Passed to `kernel agents --client` (`claude`, `codex`, `cursor`, `vscode`). Defaults to `codex` with `--agent codex`, otherwise `claude`. |
| `--reference` | Copy `evals/reference/<task>/` over the project instead of running an agent. |
| `--dry-run` | Score the template as it is. |
| `--keep` | Keep the temporary project directories (printed at the end). |
| `--work-dir`, `--out` | Where projects and results go. |

### Agents

The default is Claude Code in print mode:

```
claude -p --output-format stream-json --verbose --permission-mode acceptEdits \
  --setting-sources project,local --no-session-persistence --max-budget-usd 3 \
  --strict-mcp-config --mcp-config .mcp.json --allowedTools "Bash(npm run *)" …
```

It loads only the project's settings and MCP config, so your own MCP
servers and settings stay out of the run. Edits are accepted automatically;
the shell is limited to the project's scripts, `tsc`, `eslint`, Kernel's CLI
and read-only commands. Your user-level `CLAUDE.md` may still load; check
`agent.session` in `results.json` for the skills and MCP servers the run
actually saw.

Codex reads the prompt from stdin with `-`, and `AGENTS.md` natively.
`--agent codex` runs (see `defaultCodexCommand` in `lib/agent.mjs`):

```
codex exec --sandbox workspace-write --skip-git-repo-check --ephemeral --ignore-user-config \
  -c 'mcp_servers.kernel.command="node"' \
  -c 'mcp_servers.kernel.args=["node_modules/@kernelui-lib/cli/dist/index.js","mcp"]' \
  -c 'mcp_servers.kernel.default_tools_approval_mode="approve"' --json -
```

`kernel agents --client codex` writes the MCP server to `.codex/config.toml`,
but Codex only loads that for a trusted project, and trusting each temporary
project would write to your own Codex config. So the server is passed with
`-c` instead, and pre-approved: `codex exec` never asks for approval, so
without `default_tools_approval_mode` every MCP call fails. (Codex 0.171
removed `--full-auto`; this needs a version with `--sandbox` and `-c`.)
`--ignore-user-config` keeps your MCP servers and model settings out, but
Codex still loads skills from your home directory; check the transcript for
skills other than Kernel's. Codex reports tokens, not cost.

Any other agent works if it can run non-interactively in a directory: point
`--agent` at it. An agent that exits non-zero without calling a single tool
is reported as an error (usually a bad flag or missing auth) rather than
scored as the untouched template.

Each project is a fresh copy of `evals/template` in the OS temp directory,
outside this repo, so the agent can't read Kernel's source or this repo's
`AGENTS.md`. Its `node_modules` entries are symlinks to the template's, so
the agent gets this checkout's builds of `@kernelui-lib/react`, `/elements`,
`/styles`, `/cli` and `/eslint-plugin`, plus `lucide-react`. The project is
a git repo with the template committed, so `git diff` in a kept project
shows exactly what the agent changed.

## Scoring

Each task scores out of 100.

| Check | Points | How |
| --- | --- | --- |
| Assertions | 40 | The task's own checks, as a share passed. |
| TypeScript | 15 | `tsc --noEmit` passes. |
| Lint | 15 | `eslint src` with `kernel.configs.recommended`: −5 per error, −1 per warning. |
| Build | 10 | `vite build` succeeds. |
| axe | 20 | axe-core on the built page, light and dark, with the same tags as `scripts/check-a11y.mjs`: −5 per distinct serious or critical rule. Minor and moderate violations are listed but cost nothing. |

The 60 hygiene points (TypeScript, lint, build, axe) are multiplied by the
share of assertions passed. Otherwise an app that does nothing would score
60 for being tidy; with the scaling the untouched template scores under 20.
When the build fails, nothing can load, so only source assertions can pass.

Every task also gets a `renders` assertion: the page shows text and logs no
uncaught errors.

Not scored, but reported per task: time, cost and turns (from Claude Code's
result event), every tool the agent called, which `kernel` MCP tools it
used, and whether it used a Kernel skill, read `llms.txt` or `index.d.ts`,
ran `kernel check`, lint or the typecheck. These come from the transcript
and are best effort for agents other than Claude Code. A drop in MCP or
skill use after a docs change is the regression signal to look for.

Screenshots (light, dark and one after an interaction for each task) are
for judging what the numbers can't: whether it looks right.

## Tasks

| Task | Package | Covers |
| --- | --- | --- |
| `signup-form` | react | TextField, Checkbox, validation, `aria-invalid` |
| `settings-tabs` | react | Tabs, Switch, keyboard navigation |
| `data-table` | react | DataTable or Table, sorting, filtering, caption |
| `confirm-dialog` | react | Dialog, danger Button, live status message |
| `chat-ui` | react | MessageList, Message, Composer |
| `command-palette` | react | CommandPalette, Cmd/Ctrl+K, filtering |
| `dropdown-toolbar` | react | DropdownMenu, MenuItem, Toggle, `role="toolbar"` |
| `pricing-page` | elements | `<kernel-card>`, `<kernel-switch>`, `<kernel-badge>` |
| `file-upload` | elements | `<kernel-file-upload>`, progress, size limit |
| `migrate-shadcn` | react | Migrating a given shadcn/ui file (`tasks/migrate-shadcn.starter.tsx`) |

Every task has a reference solution in `evals/reference/<id>/`, and each
should score 100 with `--reference`. The untouched template (`--dry-run`)
scores 0 to 22 on each.

### Writing a task

A task is `evals/tasks/<id>.json`:

```jsonc
{
  "id": "confirm-dialog",
  "title": "Confirm dialog",
  "package": "react",                 // or "elements"
  "prompt": "Build …",               // what the agent is asked; the runner appends a short project description
  "files": { "src/App.tsx": "x.starter.tsx" },   // optional starter files, relative to tasks/
  "screenshots": [{ "name": "Dialog open", "steps": [ … ] }],
  "assertions": [ … ]
}
```

Assertion types:

| Type | Fields | Passes when |
| --- | --- | --- |
| `imports` | `from`, `names` (all), `anyOf` | the source imports those names from `from` |
| `source` | `pattern` or `allOf` (regex strings), `absent`, `css` | the patterns match the source (src/ and index.html), or don't with `absent`. Stylesheets are skipped unless `css: true`, so a selector like `[role="tab"]` that styles Kernel's output doesn't count as hand-rolled markup |
| `dom` | `selector`, `min` (default 1), `max` | that many elements match |
| `role` | `role`, `name`, `min`, `max` | that many accessible elements have the role (and name) |
| `eval` | `expression` | the JavaScript expression is truthy in the page |
| `check` | `check: "inputs-labelled"` | every visible form field has a non-empty label |
| `changes` | `trigger`, `attribute`, optional `selector` | the attribute (or `textContent`/`innerText`) changes after the trigger step; without `selector`, read from the trigger's own element |

Any page assertion can take `steps`, run on a freshly loaded page first:
`click`, `fill` (`value`), `check`, `focus`, `press` (`key`, e.g. `Escape`,
`ControlOrMeta+k`), `wait` (`ms`) and `setFiles` (`files: [{ name, mimeType,
size }]`). A step targets `role` + `name`, `label`, `text` or `selector`,
optionally `within` a CSS selector. A name or label written `"/…/i"` is a
regular expression; plain strings are substring matches. Keep names loose
enough that a reasonable implementation passes: the point is to check
behaviour and semantics, not wording.

Add a reference solution in `evals/reference/<id>/` (files copied over the
template) and check it scores 100 with `--reference --tasks <id>` before
relying on a new task.

## Costs

Every agent run is a real model session. The first real run of
`confirm-dialog` with `--model sonnet` took 19 seconds and cost $0.12;
larger tasks, slower models or an agent that loops on failing checks cost
more. `--budget` caps each task (default $3), `--timeout` caps its time,
and the report shows what each one cost. The
full suite is ten sessions. Run one task while working on the evals
themselves, use `--reference` to test the scoring without a model, and
choose a smaller model with `--model` for routine checks. Scores vary run
to run, so compare several runs, not one, before calling a change a
regression.

## Baseline results

28 November 2026, one run per task, `--setup full`, `--timeout 10`, with
the tasks as they are now (except that `pricing-page` asked Claude for "a
Monthly/Yearly billing switch"; see below). The references all score 100;
the untouched template averages 16.5.

**Claude Code** 2.1.332, `--model sonnet` (claude-sonnet-5-5),
`--budget 0.6`: mean **96.7**, $1.73 in total, 5 min 14 s of agent time.

| Task | Score | Assertions | Time | Cost | Turns | Kernel MCP tools used |
| --- | --- | --- | --- | --- | --- | --- |
| `chat-ui` | 100 | 11/11 | 30 s | $0.15 | 16 | get_component, get_tokens |
| `command-palette` | 100 | 9/9 | 23 s | $0.14 | 13 | search_components, get_conventions, get_component, check_code |
| `confirm-dialog` | 100 | 11/11 | 25 s | $0.13 | 9 | get_conventions, search_components, get_component |
| `data-table` | 100 | 10/10 | 35 s | $0.18 | 19 | get_conventions, search_components, get_component, check_code |
| `dropdown-toolbar` | 100 | 10/10 | 25 s | $0.16 | 14 | search_components, get_conventions, get_component, check_code |
| `file-upload` | 81.8 | 9/11 | 43 s | $0.19 | 19 | get_component, search_components, check_code |
| `migrate-shadcn` | 100 | 12/12 | 33 s | $0.18 | 20 | get_component, get_tokens |
| `pricing-page` | 85.5 | 9/10 | 46 s | $0.26 | 23 | get_component, get_tokens, check_code |
| `settings-tabs` | 100 | 11/11 | 19 s | $0.12 | 12 | get_component, check_code |
| `signup-form` | 100 | 10/10 | 35 s | $0.22 | 15 | get_conventions, get_component, check_code, get_tokens |

**Codex** CLI 0.171.0, `--agent codex` (its default model, user config
ignored), three tasks: mean **100**. Codex reports tokens, not cost.

| Task | Score | Assertions | Time | Tokens | Kernel MCP tools used |
| --- | --- | --- | --- | --- | --- |
| `confirm-dialog` | 100 | 11/11 | 51 s | 339k in (281k cached), 1.7k out | search_components, get_conventions, get_component, get_tokens, check_code |
| `pricing-page` | 100 | 10/10 | 91 s | 374k in (325k cached), 3.6k out | get_conventions, search_components, get_tokens, get_component |
| `settings-tabs` | 100 | 11/11 | 72 s | 277k in (244k cached), 3.0k out | get_conventions, search_components, get_tokens, get_component |

Every run used the Kernel MCP server, and no run left a lint error or
warning or a TypeScript error. The failures are in the framework-free
elements, where behaviour lives in the DOM rather than in types an agent
can read:

- **`<kernel-file-upload id="…">` breaks its own label.** The element gives
  its inner `<input>` the host's `id` without removing it from the host, so
  two elements share the id and the dropzone's `<label for>` resolves to
  the host. The input is left unlabelled. Claude set `id="uploader"` to find
  the element from script, the obvious thing to do; the reference solution
  hit the same bug first.
- **The inner input's `change` bubbles through the host.** Picking a file
  that is too big fires the native `change`, which bubbles through
  `<kernel-file-upload>`, after `kernel-file-upload-error`. A host `change`
  listener that clears the error, meant for the element's own
  accepted-files `change`, also runs for the rejected pick and wipes the
  message the error handler has just set. Claude's page showed no error
  for a 6 MB file because of this. It also guessed the error detail as
  `{ type: "type", file }` instead of `{ type: "accept", files }`.
- **`aria-label` on `<kernel-switch>` is dropped.** Claude labelled the
  switch `aria-label="Bill yearly"` on the tag, with visible "Monthly" and
  "Yearly" text either side. The attribute stays on the host, so the inner
  `<button role="switch">` has no name: a critical axe violation.
  `<kernel-button>` does forward `aria-label`, and the elements llms.txt
  says to label an icon-only button that way, so the agent had reason to
  expect it to work.
- **"Billing switch" read as a choice, not a control.** Codex built the
  Monthly/Yearly toggle as a `<kernel-radio-group>`, a sound design but not
  the switch the task checks for. The prompt now asks for "an on/off
  switch".
- **Codex couldn't call the MCP server at first.** `codex exec` never asks
  for approval, so every MCP call failed with "requires approval" until
  the runner pre-approved the server's tools. Codex fell back to reading
  files and still finished. An earlier attempt failed outright because
  Codex 0.171 removed `--full-auto`.
- **Smaller things.** Three Claude pages had no `<h1>` (axe
  `page-has-heading-one`: moderate, so not scored). Codex styled Kernel's
  tabs with a `[role="tab"]` selector, which the "no hand-rolled tabs"
  assertion counted until source assertions stopped reading stylesheets.
