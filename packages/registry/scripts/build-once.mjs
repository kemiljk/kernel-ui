#!/usr/bin/env node
/**
 * Builds the registry for a package that depends on it, safely when several
 * packages build in parallel.
 *
 * `bun run --filter '@kernelui-lib/*' build` runs every package's build at
 * once, and the cli, elements, eslint-plugin, agent and testing builds each
 * need `packages/registry/dist` first. When each one ran `bun run build`
 * here, they rebuilt `dist` over each other, and a package could read
 * `dist/components.js` halfway through another build's rewrite ("does not
 * provide an export named 'CATEGORIES'"). This script:
 *
 * 1. takes a lock (an exclusive `mkdir`), so only one build runs at a time;
 * 2. skips the build when `dist` is newer than everything it's built from
 *    (registry src/scripts and the React and elements sources the API
 *    extraction reads), so once one package has built it, the rest only read
 *    a finished `dist` and never rewrite it while someone else reads it.
 *
 * This package's own `bun run build` goes through it too, since the
 * filtered build runs it alongside the others; `bun run build:force` always
 * rebuilds.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const packages = path.join(root, "..");
const dist = path.join(root, "dist");
const stamp = path.join(dist, ".build-stamp");
const lock = path.join(root, ".build-lock");

const INPUTS = [
  path.join(root, "src"),
  path.join(root, "scripts"),
  path.join(root, "tsconfig.json"),
  path.join(root, "package.json"),
  path.join(packages, "react", "src"),
  path.join(packages, "elements", "src"),
];

function newestMtime(target) {
  if (!existsSync(target)) return 0;
  const info = statSync(target);
  if (!info.isDirectory()) return info.mtimeMs;
  let newest = 0;
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    newest = Math.max(newest, newestMtime(path.join(target, entry.name)));
  }
  return newest;
}

const isFresh = () =>
  existsSync(stamp) && statSync(stamp).mtimeMs >= Math.max(...INPUTS.map(newestMtime));

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function acquire() {
  const deadline = Date.now() + 5 * 60_000;
  for (;;) {
    try {
      mkdirSync(lock);
      return;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      // A lock older than a build could take is left over from a killed run.
      if (Date.now() - statSync(lock).mtimeMs > 5 * 60_000) rmSync(lock, { recursive: true, force: true });
      if (Date.now() > deadline) throw new Error(`[registry] timed out waiting for ${lock}`);
      sleep(200);
    }
  }
}

const force = process.argv.includes("--force");
if (!force && isFresh()) process.exit(0);
acquire();
try {
  // Another build may have finished while this one waited.
  if (force || !isFresh()) {
    execSync("bun run build:force", { cwd: root, stdio: "inherit" });
    writeFileSync(stamp, `${new Date().toISOString()}\n`);
  }
} finally {
  rmSync(lock, { recursive: true, force: true });
}
