#!/usr/bin/env node

/**
 * Bundle @kernelui-lib/registry data into a standalone module so the CLI
 * can run without a workspace or npm dependency on registry.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const outDir = join(__dirname, "..", "dist");
const registryDist = join(root, "registry", "dist");

// ── 1. Read the built registry.json (produced by registry/scripts/generate-assets.mjs) ──
let registryJson;
try {
  const raw = readFileSync(join(registryDist, "registry.json"), "utf8");
  registryJson = JSON.parse(raw);
} catch {
  console.error("[bundle-registry] Run \`bun run build\` in ../registry first (produces dist/registry.json).");
  process.exit(1);
}

const components = registryJson.components;
if (!Array.isArray(components) || components.length === 0) {
  console.error("[bundle-registry] Expected components array in registry/dist/registry.json");
  process.exit(1);
}

// ── 2. Generate registry-bundle.d.ts (types the CLI can import from) ────
const dtsContent = `export interface RegistryEntry {
  name: string;
  category: "Primitives" | "Forms" | "Layout" | "Feedback" | "Overlays" | "Navigation" | "Data Display" | "AI";
  slug: string;
  element: string;
  summary: string;
  llmsNote?: string;
  status: "available" | "planned";
  reactExports: string[];
  elementTag: string;
  elementSubTags?: string[];
  docsUrl: string;
  shadcnAliases?: string[];
  radixPackages?: string[];
  migrationCaveats?: string[];
}

export declare const components: RegistryEntry[];
export declare function getComponentBySlug(slug: string): RegistryEntry | undefined;
`;

// ── 3. Generate registry-bundle.js (standalone, no external deps) ────────
const jsContent = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComponentBySlug = exports.components = void 0;
// Bundled at build time from @kernelui-lib/registry
exports.components = ${JSON.stringify(components, null, 2)};
exports.getComponentBySlug = function (slug) {
  return exports.components.find(function (entry) { return entry.slug === slug; });
};
`;

// ── 4. Write to dist/ ───────────────────────────────────────────────────
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "registry-bundle.d.ts"), dtsContent);
writeFileSync(join(outDir, "registry-bundle.js"), jsContent);

// Also emit .d.ts and a thin re-export .js into src/lib/ so TypeScript
// can resolve `from "./registry-bundle.js"` during typecheck.
const srcLibDir = join(__dirname, "..", "src", "lib");
mkdirSync(srcLibDir, { recursive: true });
writeFileSync(join(srcLibDir, "registry-bundle.d.ts"), dtsContent);
// The JS file is an ESM shim that re-exports from the dist output.
// At compile time this resolves types; at runtime tsc emits it as-is
// and node loads the bundled data from dist.
writeFileSync(
  join(srcLibDir, "registry-bundle.js"),
  `export { components, getComponentBySlug } from "../dist/registry-bundle.js";`,
);

console.log(`[bundle-registry] Bundled ${components.length} components → dist/registry-bundle.*`);
