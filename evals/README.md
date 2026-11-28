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
| `--agent "<cmd>"` | The agent command, run in the task's project directory. `{prompt}`, `{prompt_file}` and `{dir}` are replaced (shell-quoted); without `{prompt}` or `{prompt_file}` the prompt goes to stdin. |
| `--model <name>` | Model for the default Claude Code command. |
| `--budget <usd>` | `--max-budget-usd` per task for the default Claude Code command (default 3). |
| `--timeout <min>` | Time limit per task; the agent's whole process group is killed after it (default 15). |
| `--setup full\|none` | `full` (default) runs this checkout's `kernel agents` in the project: skills in `.claude/skills`, the `kernel` MCP server pointed at the workspace CLI build, and the Kernel section in `AGENTS.md`. `none` gives the agent only the installed packages, which tests whether it finds `llms.txt` and the types on its own. |
| `--client <name>` | Passed to `kernel agents --client` (`claude`, `codex`, `cursor`, `vscode`). |
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

Codex reads the prompt from stdin with `-`, and `AGENTS.md` natively:

```bash
node evals/run.mjs --client codex \
  --agent "codex exec --full-auto --skip-git-repo-check --json -"
```

`--client codex` writes the MCP server to `.codex/config.toml`, which Codex
only loads for a trusted project. Any other agent works if it can run
non-interactively in a directory: point `--agent` at it.

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

Reference solutions for `confirm-dialog`, `signup-form`, `settings-tabs` and
`pricing-page` live in `evals/reference/` and should score 100.

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
| `source` | `pattern` or `allOf` (regex strings), `absent` | the patterns match the source (src/ and index.html), or don't with `absent` |
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
