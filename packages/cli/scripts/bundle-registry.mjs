#!/usr/bin/env node

/**
 * Bundle @kernelui-lib/registry data into a standalone module so the CLI
 * can run without a workspace or npm dependency on registry.
 */

import { cpSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
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

// ── 5. Agent data for `kernel mcp`: exact APIs, tokens, conventions ─────
// Bundled for the same reason as the catalog: the server must answer
// offline and match the installed version, never a hosted page that drifts.
const api = JSON.parse(readFileSync(join(registryDist, "api.json"), "utf8")).components;

// Every --kernel-* token in tokens.css with its value and the comment block
// directly above it, so `get_tokens` can say what a token is *for*.
const tokensCss = readFileSync(join(root, "styles", "src", "tokens.css"), "utf8");
const tokens = [];
// Each token takes the nearest comment above it (a comment introduces the
// group of declarations under it), minus decorative "-----" divider rules.
const pieces = [...tokensCss.matchAll(/\/\*([\s\S]*?)\*\/|(--kernel-[\w-]+)\s*:\s*([^;]+);/g)];
let note;
for (const piece of pieces) {
  if (piece[1] !== undefined) {
    const text = piece[1]
      .split("\n")
      .map((l) => l.replace(/^\s*\*?\s?/, "").trimEnd())
      .filter((l) => !/^-{3,}$/.test(l.trim()))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    // A divider-only comment followed by a one-line heading keeps the heading.
    if (text) note = text;
    continue;
  }
  if (tokens.some((t) => t.name === piece[2])) continue;
  tokens.push({ name: piece[2], value: piece[3].replace(/\s+/g, " ").trim(), ...(note ? { note } : {}) });
}

// The hand-written halves of both llms.txt files (everything outside the
// generated component list): install steps and cross-component conventions.
function conventions(file) {
  const text = readFileSync(join(root, file), "utf8");
  const start = text.indexOf("<!-- GENERATED:COMPONENTS:START -->");
  const end = text.indexOf("<!-- GENERATED:COMPONENTS:END -->");
  return start === -1 ? text : (text.slice(0, start) + text.slice(end + "<!-- GENERATED:COMPONENTS:END -->".length)).trim();
}
const agentData = {
  api,
  tokens,
  conventions: { react: conventions("react/llms.txt"), elements: conventions("elements/llms.txt") },
};
writeFileSync(
  join(outDir, "agent-bundle.cjs"),
  `"use strict";\n// Bundled at build time from @kernelui-lib/registry and @kernelui-lib/styles\nmodule.exports = ${JSON.stringify(agentData)};\n`,
);

// ── 6. Skills: a fallback copy for projects that haven't installed the
// packages yet. `kernel agents` prefers the copy in node_modules, which
// always matches the installed version.
rmSync(join(outDir, "skills"), { recursive: true, force: true });
for (const pkg of ["react", "elements"]) {
  cpSync(join(root, pkg, "skills"), join(outDir, "skills", pkg), { recursive: true });
}

console.log(
  `[bundle-registry] Bundled ${components.length} components → dist/registry-bundle.*, ` +
    `${Object.keys(api).length} APIs and ${tokens.length} tokens → dist/agent-bundle.cjs`,
);
