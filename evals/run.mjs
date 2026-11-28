#!/usr/bin/env node
/**
 * Kernel agent evals: fixed UI tasks, each built by a coding agent in a
 * fresh copy of evals/template, then scored by TypeScript, Kernel's ESLint
 * plugin, a production build, axe-core in Chromium and the task's own DOM
 * assertions, with screenshots for a human to look at.
 *
 *   node evals/run.mjs                         # every task, default agent (claude CLI)
 *   node evals/run.mjs --tasks confirm-dialog  # one task
 *   node evals/run.mjs --reference             # score evals/reference/* (no model calls)
 *   node evals/run.mjs --dry-run               # score the untouched template (baseline)
 *   node evals/run.mjs --agent "codex exec --full-auto --skip-git-repo-check -"
 *
 * Every agent run costs money. See evals/README.md before running the suite.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import { buildPrompt, defaultClaudeCommand, runAgent } from "./lib/agent.mjs";
import { summaryTable, writeReport } from "./lib/report.mjs";
import { build, computeScore, inspect, lint, typecheck } from "./lib/score.mjs";
import { run } from "./lib/util.mjs";
import { applyReference, hasReference, loadTasks, prepareProject } from "./lib/workspace.mjs";

const root = new URL("..", import.meta.url).pathname;
const { values: args } = parseArgs({
  options: {
    tasks: { type: "string" },
    agent: { type: "string" },
    model: { type: "string" },
    budget: { type: "string", default: "3" },
    timeout: { type: "string", default: "15" },
    setup: { type: "string", default: "full" },
    client: { type: "string", default: "claude" },
    reference: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    build: { type: "boolean", default: false },
    keep: { type: "boolean", default: false },
    "work-dir": { type: "string" },
    out: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (args.help) {
  console.log(`Usage: node evals/run.mjs [options]

  --tasks a,b        Only these task ids (default: all; with --reference, those with a reference)
  --agent "<cmd>"    Agent command, run in the task's project dir. {prompt}, {prompt_file} and
                     {dir} are substituted; otherwise the prompt is piped to stdin.
                     Default: claude -p (stream-json, acceptEdits, project settings only)
  --model <name>     Model for the default claude command (e.g. sonnet)
  --budget <usd>     --max-budget-usd per task for the default claude command (default 3)
  --timeout <min>    Agent time limit per task (default 15)
  --setup full|none  full: run \`kernel agents\` in the project (skills, MCP, AGENTS.md) from this
                     checkout; none: only the installed packages (default full)
  --client <name>    Client for \`kernel agents --client\` (claude, codex, cursor, vscode)
  --reference        Score evals/reference/<task>/ instead of running an agent
  --dry-run          Score the untouched template (a baseline; checks the pipeline)
  --build            Rebuild the workspace packages first (otherwise only if dist is missing)
  --keep             Keep the temporary project directories
  --work-dir <dir>   Where projects are created (default: a new dir in the OS temp dir)
  --out <dir>        Results directory (default evals/results/<timestamp>)`);
  process.exit(0);
}

const mode = args.reference ? "reference" : args["dry-run"] ? "dry-run" : "agent";
if (!["full", "none"].includes(args.setup)) throw new Error(`--setup must be "full" or "none"`);

let tasks = loadTasks(args.tasks?.split(",").map((s) => s.trim()).filter(Boolean));
if (mode === "reference" && !args.tasks) tasks = tasks.filter(hasReference);

// The template resolves the workspace packages through their dist builds.
// Pass --build after changing a package, or the evals score the old build.
const dists = ["react", "elements", "eslint-plugin", "cli"].map((p) => join(root, "packages", p, "dist"));
if (args.build || dists.some((d) => !existsSync(d))) {
  console.log("Building workspace packages (bun run build)…");
  const r = await run("bun", ["run", "build"], { cwd: root });
  if (r.code !== 0) {
    console.error(r.stdout + r.stderr);
    process.exit(1);
  }
}

const runId = new Date().toISOString().replace(/[:.]/g, "-").replace("Z", "");
const outDir = args.out ?? join(root, "evals", "results", runId);
mkdirSync(outDir, { recursive: true });
const workRoot = args["work-dir"] ? join(args["work-dir"], runId) : mkdtempSync(join(tmpdir(), "kernel-evals-"));
mkdirSync(workRoot, { recursive: true });

const git = await run("git", ["rev-parse", "--short", "HEAD"], { cwd: root });
const dirty = await run("git", ["status", "--porcelain"], { cwd: root });
const results = {
  runId,
  mode,
  setup: mode === "agent" ? args.setup : "n/a",
  agentCommand: mode === "agent" ? (args.agent ?? "default claude") : null,
  git: { sha: git.stdout.trim(), dirty: dirty.stdout.trim().length > 0 },
  startedAt: new Date().toISOString(),
  tasks: [],
  summary: {},
};

let browser;
try {
  browser = await chromium.launch();
} catch {
  browser = await chromium.launch({ channel: "chrome" });
}

console.log(`Kernel evals: ${tasks.length} task(s), mode ${mode}. Projects in ${workRoot}\n`);
for (const task of tasks) {
  const taskOut = join(outDir, task.id);
  mkdirSync(taskOut, { recursive: true });
  const started = Date.now();
  const entry = { id: task.id, title: task.title, package: task.package, mode };
  process.stdout.write(`▸ ${task.id} … `);
  try {
    const dir = await prepareProject(task, { workRoot, setup: mode === "agent" ? args.setup : "none", client: args.client });
    if (mode === "reference") applyReference(task, dir);
    if (mode === "agent") {
      const command = args.agent ?? defaultClaudeCommand({ model: args.model, budget: args.budget, dir });
      entry.agent = await runAgent({ command, prompt: buildPrompt(task), dir, timeoutMs: Number(args.timeout) * 60_000, logDir: taskOut });
      process.stdout.write(`agent ${Math.round(entry.agent.durationMs / 1000)}s${entry.agent.timedOut ? " (timed out)" : ""} … `);
    }
    entry.typecheck = await typecheck(dir);
    entry.lint = await lint(dir);
    entry.build = await build(dir);
    entry.inspect = await inspect(task, dir, { browser, outDir: taskOut, built: entry.build.pass });
    entry.score = computeScore(entry);
    // Keep what was built, for review (no node_modules / dist).
    cpSync(dir, join(taskOut, "output"), { recursive: true, filter: (src) => !/[/\\](node_modules|dist|\.git)([/\\]|$)/.test(src.slice(dir.length)) });
    console.log(`${entry.score.total}/100`);
  } catch (error) {
    entry.error = String(error.stack ?? error);
    console.log(`error: ${String(error.message ?? error).split("\n")[0]}`);
  }
  entry.durationMs = Date.now() - started;
  results.tasks.push(entry);
}
await browser.close();

const scored = results.tasks.filter((t) => !t.error);
results.finishedAt = new Date().toISOString();
results.summary = {
  tasks: results.tasks.length,
  errors: results.tasks.length - scored.length,
  meanScore: scored.length ? Math.round((scored.reduce((a, t) => a + t.score.total, 0) / scored.length) * 10) / 10 : 0,
  totalCostUsd: scored.some((t) => t.agent?.costUsd != null) ? Math.round(scored.reduce((a, t) => a + (t.agent?.costUsd ?? 0), 0) * 1000) / 1000 : null,
};
writeReport(results, outDir);
if (!args.keep) rmSync(workRoot, { recursive: true, force: true });

console.log(`\n${summaryTable(results)}\n`);
console.log(`Mean score ${results.summary.meanScore}/100${results.summary.totalCostUsd != null ? `, agent cost $${results.summary.totalCostUsd}` : ""}`);
console.log(`Report: ${join(outDir, "index.html")}${args.keep ? `\nProjects kept in ${workRoot}` : ""}`);
process.exit(results.summary.errors ? 1 : 0);
