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
// `.cjs`, NOT `.js`: this package is "type": "module", so Node reads a bare
// `.js` here as ESM and the CommonJS body below dies on `exports is not
// defined` the moment anything loads it. The extension is the only thing
// that says "this file really is CommonJS".
writeFileSync(join(outDir, "registry-bundle.cjs"), jsContent);

// Also emit .d.ts and a thin re-export .js into src/lib/ so TypeScript
// can resolve `from "./registry-bundle.js"` during typecheck.
const srcLibDir = join(__dirname, "..", "src", "lib");
mkdirSync(srcLibDir, { recursive: true });
writeFileSync(join(srcLibDir, "registry-bundle.d.ts"), dtsContent);
// An ESM shim so TypeScript can resolve the module during typecheck. It is
// NOT emitted to dist (tsc doesn't copy .js without allowJs) and nothing
// loads it at runtime — registry.ts requires the .cjs directly.
writeFileSync(
  join(srcLibDir, "registry-bundle.js"),
  `export { components, getComponentBySlug } from "../dist/registry-bundle.cjs";`,
);

console.log(`[bundle-registry] Bundled ${components.length} components → dist/registry-bundle.*`);
