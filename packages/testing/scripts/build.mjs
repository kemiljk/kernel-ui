#!/usr/bin/env node
/**
 * Builds dist/:
 *   - ESM + .d.ts from src/ with tsc (unbundled; imports already carry .js)
 *   - dist/kernel-testing.global.js, an IIFE defining window.KernelTesting,
 *     for Playwright's page.addScriptTag() and plain <script> use
 * Run scripts/generate.mjs first (the package's `build` script does).
 */
import { execFileSync } from "node:child_process";
import { rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
rmSync(join(pkg, "dist"), { recursive: true, force: true });

execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"), "-p", "tsconfig.build.json"], { cwd: pkg, stdio: "inherit" });

// CommonJS for the main entry: Jest's default (non-ESM) mode resolves the
// `require` condition and can't load an ESM file without extra transform
// config. Bundled, since the unbundled ESM files import each other by .js.
execFileSync("bun", ["build", "src/index.ts", "--format=cjs", "--target=node", "--outfile=dist/index.cjs"], { cwd: pkg, stdio: "inherit" });

const out = join(pkg, "dist/kernel-testing.global.js");
execFileSync("bun", ["build", "scripts/browser-entry.ts", "--format=iife", "--target=browser", "--minify-syntax", "--minify-whitespace", `--outfile=${out}`], { cwd: pkg, stdio: "inherit" });
console.log(`[testing] built dist/ (browser bundle ${(statSync(out).size / 1024).toFixed(1)} KiB)`);
