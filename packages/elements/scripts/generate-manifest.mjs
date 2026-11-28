#!/usr/bin/env node

/**
 * Writes the editor and framework metadata for every tag into dist/, from
 * the API the registry already extracts from source (registry/dist/api.json:
 * per tag, its JSDoc, observedAttributes and dispatched CustomEvents). No
 * analyzer dependency, and nothing hand-written to drift.
 *
 * - custom-elements.json: Custom Elements Manifest (schema 2.1.0), read by
 *   Storybook, Lit's tooling, the web-components language server and the
 *   `customElements` field in package.json.
 * - vscode.html-custom-data.json: VS Code HTML custom data, for tag and
 *   attribute completion in plain .html files.
 * - jsx.d.ts: declares every tag in React 19's JSX namespace, so TSX accepts
 *   `<kernel-button variant="primary">` without a cast.
 *
 * Runs after `vite build`; the package's build script builds the registry
 * first.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(pkgDir, "dist");
const apiPath = join(pkgDir, "..", "registry", "dist", "api.json");

let api;
try {
  api = JSON.parse(readFileSync(apiPath, "utf8"));
} catch {
  console.error("[generate-manifest] Run `bun run build` in ../registry first (produces dist/api.json).");
  process.exit(1);
}

// Tag → class name, from the `customElements.define("tag", Class)` calls
// themselves, plus which classes the package entry actually exports.
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith(".ts") && !full.endsWith(".d.ts") ? [full] : [];
  });
}
const classByTag = new Map();
for (const file of walk(join(pkgDir, "src"))) {
  for (const m of readFileSync(file, "utf8").matchAll(/customElements\.define\(\s*"([^"]+)",\s*([A-Za-z0-9_$]+)/g)) {
    classByTag.set(m[1], m[2]);
  }
}
const indexSource = readFileSync(join(pkgDir, "src", "index.ts"), "utf8");
const exported = new Set(
  [...indexSource.matchAll(/export\s*\{([^}]*)\}/g)].flatMap((m) =>
    m[1]
      .split(",")
      .map((s) => s.trim().split(/\s+as\s+/).pop())
      .filter(Boolean),
  ),
);

function pascal(tag) {
  return tag.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
}

const tags = [];
for (const component of Object.values(api.components)) {
  for (const [tag, info] of Object.entries(component.elements ?? {})) {
    tags.push({
      tag,
      className: classByTag.get(tag) ?? pascal(tag),
      description: info.description ?? "",
      attributes: [...new Set(info.attributes ?? [])],
      events: [...new Set(info.events ?? [])],
    });
  }
}
tags.sort((a, b) => a.tag.localeCompare(b.tag));

if (tags.length === 0) {
  console.error("[generate-manifest] api.json lists no custom elements.");
  process.exit(1);
}

// ── custom-elements.json ──
// One module: the package ships a single bundle, and importing it defines
// every tag, so that is the path consumers and tools actually load.
const manifest = {
  schemaVersion: "2.1.0",
  readme: "README.md",
  modules: [
    {
      kind: "javascript-module",
      path: "dist/index.js",
      declarations: tags.map((t) => ({
        kind: "class",
        name: t.className,
        tagName: t.tag,
        customElement: true,
        description: t.description,
        superclass: { name: "HTMLElement" },
        attributes: t.attributes.map((name) => ({ name })),
        events: t.events.map((name) => ({ name, type: { text: "CustomEvent" } })),
      })),
      exports: [
        ...tags
          .filter((t) => exported.has(t.className))
          .map((t) => ({
            kind: "js",
            name: t.className,
            declaration: { name: t.className, module: "dist/index.js" },
          })),
        ...tags.map((t) => ({
          kind: "custom-element-definition",
          name: t.tag,
          declaration: { name: t.className, module: "dist/index.js" },
        })),
      ],
    },
  ],
};
writeFileSync(join(distDir, "custom-elements.json"), `${JSON.stringify(manifest, null, 2)}\n`);

// ── vscode.html-custom-data.json ──
const docsBase = "https://www.kernelui.com/components";
const slugByTag = new Map();
for (const [slug, component] of Object.entries(api.components)) {
  for (const tag of Object.keys(component.elements ?? {})) slugByTag.set(tag, slug);
}
const customData = {
  version: 1.1,
  tags: tags.map((t) => ({
    name: t.tag,
    description: { kind: "markdown", value: t.description },
    attributes: t.attributes.map((name) => ({ name })),
    references: slugByTag.has(t.tag) ? [{ name: "Kernel docs", url: `${docsBase}/${slugByTag.get(t.tag)}` }] : [],
  })),
};
writeFileSync(join(distDir, "vscode.html-custom-data.json"), `${JSON.stringify(customData, null, 2)}\n`);

// ── jsx.d.ts ──
// Attributes accept what React 19 does with a custom element's attribute:
// a string, a number (stringified), or a boolean (true sets it empty, false
// removes it). `on<event>` props are React 19's listener syntax for custom
// elements: the name after `on` is the event name, verbatim.
const q = (s) => JSON.stringify(s);
const typeImports = tags.filter((t) => exported.has(t.className)).map((t) => t.className);
const lines = [
  "// Generated by scripts/generate-manifest.mjs from registry/dist/api.json. Do not edit.",
  "//",
  "// Declares every <kernel-*> tag for React 19 TSX. Load it once, e.g.",
  '//   import type {} from "@kernelui-lib/elements/jsx";',
  "// or add \"@kernelui-lib/elements/jsx\" to compilerOptions.types.",
  'import type * as React from "react";',
  `import type { ${[...new Set(typeImports)].sort().join(", ")} } from "./index.js";`,
  "",
  "type KernelElementProps<E extends HTMLElement, A> = Omit<React.DetailedHTMLProps<React.HTMLAttributes<E>, E>, keyof A> & A;",
  "type KernelAttr = string | number | boolean;",
  "",
  'declare module "react" {',
  "  namespace JSX {",
  "    interface IntrinsicElements {",
];
for (const t of tags) {
  const el = exported.has(t.className) ? t.className : "HTMLElement";
  const members = [
    // aria-*/data-* keep React's own typing.
    ...t.attributes.filter((a) => !/^(aria|data)-/.test(a)).map((a) => `${q(a)}?: KernelAttr`),
    ...t.events.map((e) => `${q(`on${e}`)}?: (event: CustomEvent) => void`),
  ];
  lines.push(`      ${q(t.tag)}: KernelElementProps<${el}, { ${members.join("; ")}${members.length ? ";" : ""} }>;`);
}
lines.push("    }", "  }", "}", "");
writeFileSync(join(distDir, "jsx.d.ts"), lines.join("\n"));

console.log(`[generate-manifest] wrote custom-elements.json, vscode.html-custom-data.json, jsx.d.ts (${tags.length} tags)`);
