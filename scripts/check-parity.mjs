#!/usr/bin/env node
/**
 * Every component ships twice (AGENTS.md: "build every component twice").
 * Until now that was enforced by review alone. This checks the registry
 * against both packages' real sources, so a component added to one
 * package, an export dropped from an index, or a custom element that
 * never gets defined fails CI instead of shipping:
 *
 *   - each registry entry's reactExports are exported from
 *     packages/react/src/index.ts
 *   - its elementTag and elementSubTags are passed to
 *     customElements.define() somewhere in packages/elements/src
 *   - packages/react/src/components and packages/elements/src/components
 *     hold the same component folders
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const registry = JSON.parse(readFileSync(join(root, "apps/docs/public/registry.json"), "utf8"));

const reactIndex = readFileSync(join(root, "packages/react/src/index.ts"), "utf8");
const reactExports = new Set();
for (const match of reactIndex.matchAll(/export\s*\{([^}]*)\}/g)) {
  for (const raw of match[1].split(",")) {
    const name = raw.trim().split(/\s+as\s+/).pop()?.trim();
    if (name) reactExports.add(name);
  }
}
for (const match of reactIndex.matchAll(/export\s+(?:const|function|class)\s+(\w+)/g)) {
  reactExports.add(match[1]);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith(".ts") ? [path] : [];
  });
}
const definedTags = new Set();
for (const file of walk(join(root, "packages/elements/src"))) {
  for (const match of readFileSync(file, "utf8").matchAll(/customElements\.define\(\s*["'`]([a-z0-9-]+)["'`]/g)) {
    definedTags.add(match[1]);
  }
}

const problems = [];
for (const entry of registry.components) {
  if (entry.status !== "available") continue;
  for (const name of entry.reactExports ?? []) {
    if (!reactExports.has(name)) problems.push(`${entry.name}: React export "${name}" missing from packages/react/src/index.ts`);
  }
  for (const tag of [entry.elementTag, ...(entry.elementSubTags ?? [])].filter(Boolean)) {
    if (!definedTags.has(tag)) problems.push(`${entry.name}: <${tag}> is never passed to customElements.define()`);
  }
}

const dirs = (pkg) =>
  new Set(
    readdirSync(join(root, `packages/${pkg}/src/components`)).filter((name) =>
      statSync(join(root, `packages/${pkg}/src/components`, name)).isDirectory(),
    ),
  );
const reactDirs = dirs("react");
const elementDirs = dirs("elements");
for (const name of reactDirs) if (!elementDirs.has(name)) problems.push(`${name}: in packages/react but not packages/elements`);
for (const name of elementDirs) if (!reactDirs.has(name)) problems.push(`${name}: in packages/elements but not packages/react`);

if (problems.length) {
  console.error("Component parity problems:\n");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`check-parity: ${registry.components.length} components ship in both packages.`);
