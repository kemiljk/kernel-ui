#!/usr/bin/env node
/**
 * Runs the react package's watch build and the docs dev server together,
 * labelled and colour-coded, and tears both down cleanly on Ctrl-C.
 *
 * This exists instead of a `concurrently`/`npm-run-all`-style
 * devDependency for one reason: adding a devDependency to package.json
 * does nothing until someone re-runs `bun install`, and "bun dev"
 * failing with "concurrently: command not found" on a machine that
 * hasn't just done that is exactly the bug this replaces. All the
 * process orchestration this needs, spawn two processes, prefix their
 * output, forward Ctrl-C, is `node:child_process`, already in the
 * runtime either way, so there's nothing to install and nothing to
 * forget to install.
 */
import { spawn } from "node:child_process";

// Built from the character code rather than a literal escape in source,
// so this file stays plain, greppable ASCII instead of carrying an
// invisible control byte.
const ESC = String.fromCharCode(27);

const tasks = [
  { name: "react", color: 34, cwd: "packages/react", args: ["run", "dev"] },
  { name: "docs", color: 32, cwd: "apps/docs", args: ["run", "dev"] },
];

const children = [];
let shuttingDown = false;

function prefix(name, color) {
  return `${ESC}[${color}m[${name}]${ESC}[0m`;
}

function pipe(child, name, color) {
  const tag = prefix(name, color);
  for (const stream of [child.stdout, child.stderr]) {
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) console.log(`${tag} ${line}`);
    });
  }
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}

for (const task of tasks) {
  const child = spawn("bun", task.args, {
    cwd: new URL(`../${task.cwd}/`, import.meta.url),
    stdio: ["ignore", "pipe", "pipe"],
  });
  pipe(child, task.name, task.color);
  child.on("exit", (code) => {
    console.log(`${prefix(task.name, task.color)} exited with code ${code}`);
    shutdown(code ?? 1);
  });
  children.push(child);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
