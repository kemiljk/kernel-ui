#!/usr/bin/env node
/**
 * Checks what @kernelui-lib/react, @kernelui-lib/elements and
 * @kernelui-lib/testing would publish,
 * against their built dist/. Builds nothing: run it after the package
 * builds. Fails when
 *
 *   - any `exports` target (or main/module/types/style/customElements)
 *     points at a file that doesn't exist,
 *   - `"use client"` isn't the first statement of react's JS bundles (the
 *     directive is ignored anywhere else, and Next.js then refuses to import
 *     Kernel from a Server Component),
 *   - either package's styles.layer.css is missing or doesn't open with the
 *     layer order statement that puts components above tokens and reset,
 *   - custom-elements.json doesn't parse, or misses a tag the registry
 *     lists (elementTag or elementSubTags).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const failures = [];
const fail = (msg) => failures.push(msg);

function exportTargets(value) {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap(exportTargets);
  return [];
}

function checkTargets(pkgDir) {
  const pkg = JSON.parse(readFileSync(join(root, pkgDir, "package.json"), "utf8"));
  const targets = [
    ...exportTargets(pkg.exports ?? {}),
    ...["main", "module", "types", "style", "customElements"].map((key) => pkg[key]).filter(Boolean),
  ];
  for (const target of new Set(targets)) {
    if (target.includes("*")) continue;
    if (!existsSync(join(root, pkgDir, target))) fail(`${pkg.name}: ${target} is listed in package.json but missing`);
  }
  return pkg;
}

// ── exports targets ──
checkTargets("packages/react");
checkTargets("packages/testing");
const elementsPkg = checkTargets("packages/elements");
if (!elementsPkg.customElements) fail(`${elementsPkg.name}: package.json has no "customElements" field`);

// ── "use client" first ──
// A directive is only a directive inside the prologue, so nothing but
// whitespace and other directives may precede it. Checking the opening
// bytes is stricter than that, and is what the build emits.
for (const file of ["packages/react/dist/index.js", "packages/react/dist/index.cjs"]) {
  const path = join(root, file);
  if (!existsSync(path)) continue; // already reported as a missing target
  const head = readFileSync(path, "utf8").slice(0, 32);
  if (!/^\s*["']use client["'];?/.test(head)) fail(`${file} doesn't start with "use client" (starts: ${JSON.stringify(head)})`);
}

// ── layered CSS ──
const ORDER = "@layer kernel.tokens, kernel.base, kernel.components;";
for (const file of ["packages/react/dist/kernel.layer.css", "packages/elements/dist/kernel.layer.css"]) {
  const path = join(root, file);
  if (!existsSync(path)) {
    fail(`${file} is missing`);
    continue;
  }
  const css = readFileSync(path, "utf8");
  if (!css.startsWith(ORDER)) fail(`${file} doesn't start with "${ORDER}"`);
  if (!/@layer kernel\.components\s*\{/.test(css)) fail(`${file} doesn't wrap its rules in @layer kernel.components`);
  if (/@import|@charset/.test(css)) fail(`${file} contains @import/@charset, which is invalid inside a layer block`);
}

// ── custom-elements.json ──
const manifestPath = join(root, "packages/elements/dist/custom-elements.json");
if (existsSync(manifestPath)) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    fail(`custom-elements.json doesn't parse: ${error.message}`);
  }
  if (manifest) {
    if (typeof manifest.schemaVersion !== "string") fail("custom-elements.json has no schemaVersion");
    const declared = new Set(
      (manifest.modules ?? []).flatMap((mod) =>
        (mod.declarations ?? []).filter((d) => d.customElement && d.tagName).map((d) => d.tagName),
      ),
    );
    const defined = new Set(
      (manifest.modules ?? []).flatMap((mod) =>
        (mod.exports ?? []).filter((e) => e.kind === "custom-element-definition").map((e) => e.name),
      ),
    );
    const registry = JSON.parse(readFileSync(join(root, "apps/docs/public/registry.json"), "utf8"));
    for (const entry of registry.components) {
      if (entry.status && entry.status !== "available") continue;
      for (const tag of [entry.elementTag, ...(entry.elementSubTags ?? [])].filter(Boolean)) {
        if (!declared.has(tag)) fail(`custom-elements.json has no declaration for <${tag}> (${entry.name})`);
        if (!defined.has(tag)) fail(`custom-elements.json has no custom-element-definition export for <${tag}>`);
      }
    }
  }
}

if (failures.length) {
  console.error(`check-package-exports: ${failures.length} problem(s)\n`);
  for (const msg of failures) console.error(`  - ${msg}`);
  console.error("\nRun `bun run build` in packages/react, packages/elements and packages/testing first.");
  process.exit(1);
}
console.log("check-package-exports: exports, \"use client\", layered CSS and custom-elements.json all OK");
