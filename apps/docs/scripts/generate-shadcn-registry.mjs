// Writes a shadcn registry to public/r/ so `npx shadcn add
// https://www.kernelui.com/r/<name>.json` works and the shadcn MCP server can
// browse Kernel. Runs before `astro build`, which copies public/ into dist/.
//
// Kernel components are an npm package, not copy-paste source, so the honest
// mapping is not "vendor the component into the project". Each item instead:
//   - installs @kernelui-lib/react (an npm dependency the CLI adds),
//   - depends on the `kernel-ui` item, which adds the two stylesheet imports
//     to the project's CSS file, and
//   - writes one small file, components/kernel/<slug>.tsx, that re-exports the
//     component and its types from the package. It gives the project the
//     `@/components/kernel/<slug>` import path shadcn users expect, without a
//     fork: the component keeps updating with the package.
//
// The input is the same @kernelui-lib/registry catalogue that public/registry.json
// is built from; that file keeps its own shape for its existing consumers.
//
// Set KERNEL_REGISTRY_URL to point registryDependencies at another host (a
// local `astro preview`, for instance). It defaults to the production site.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { components } from "@kernelui-lib/registry";

const docsRoot = path.join(import.meta.dirname, "..");
const repoRoot = path.join(docsRoot, "..", "..");
const outDir = path.join(docsRoot, "public", "r");
const baseUrl = (process.env.KERNEL_REGISTRY_URL ?? "https://www.kernelui.com").replace(/\/$/, "");
const homepage = "https://www.kernelui.com";
const author = `Kernel UI <${homepage}>`;
const setupItem = "kernel-ui";

/**
 * Read packages/react/src/index.ts and group its exports by source module, so
 * a component's re-export can carry every type its module exports (Dialog →
 * DialogProps, DialogState, DialogLabels, …) without guessing from names.
 */
async function readReactExports() {
  const source = await readFile(path.join(repoRoot, "packages", "react", "src", "index.ts"), "utf8");
  const modules = new Map();
  const pattern = /export\s+(type\s+)?\{([^}]*)\}\s+from\s+"([^"]+)"/g;
  for (const match of source.matchAll(pattern)) {
    const [, isType, names, from] = match;
    const entry = modules.get(from) ?? { values: [], types: [] };
    const list = names
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => name.split(/\s+as\s+/).pop().trim());
    (isType ? entry.types : entry.values).push(...list);
    modules.set(from, entry);
  }
  return [...modules.values()];
}

function slugToCategory(category) {
  return category.toLowerCase().replace(/\s+/g, "-");
}

function componentFile(entry, modules) {
  const values = entry.reactExports;
  const types = [
    ...new Set(
      modules.filter((m) => m.values.some((v) => values.includes(v))).flatMap((m) => m.types),
    ),
  ];
  const missing = values.filter((v) => !modules.some((m) => m.values.includes(v)));
  if (missing.length) {
    throw new Error(`[shadcn-registry] ${entry.name}: ${missing.join(", ")} not exported from @kernelui-lib/react`);
  }
  const lines = [
    "/**",
    ` * Kernel UI ${entry.name}: ${entry.summary}`,
    ` * Built on ${entry.element}.`,
    " *",
    " * This file re-exports @kernelui-lib/react; the component itself lives in",
    " * the package and updates with it. Don't copy its source here. Change its",
    " * look with --kernel-* tokens or className, and its text with `labels`.",
    " *",
    ` * Docs: ${entry.docsUrl}`,
    " */",
    `export { ${values.join(", ")} } from "@kernelui-lib/react";`,
  ];
  if (types.length) lines.push(`export type { ${types.join(", ")} } from "@kernelui-lib/react";`);
  return `${lines.join("\n")}\n`;
}

function setup() {
  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: setupItem,
    type: "registry:item",
    title: "Kernel UI",
    description:
      "Installs @kernelui-lib/react and @kernelui-lib/styles and imports Kernel's tokens, reset and component stylesheet into your CSS.",
    author,
    dependencies: ["@kernelui-lib/react", "@kernelui-lib/styles"],
    // A shadcn project is a Tailwind v4 project. Kernel's tokens and reset are
    // imported into Tailwind's `base` layer, so Tailwind's preflight, the
    // project's own base styles and every utility still win over the reset
    // (its body colours and :focus-visible ring would otherwise restyle the
    // shadcn components). The component stylesheet stays unlayered, as on
    // the installation page: its class names are Kernel's own, so it can't
    // collide with shadcn's.
    css: {
      '@import "@kernelui-lib/styles" layer(base)': {},
      '@import "@kernelui-lib/react/styles.css"': {},
    },
    docs: `Kernel components come from the @kernelui-lib/react package: import them from "@kernelui-lib/react" or from the re-export files written to components/kernel/. Kernel's tokens and reset were imported into Tailwind's base layer, so your existing styles and utilities still take precedence. Don't add @kernelui-lib/styles/tailwind.css to a shadcn project: it maps Tailwind names such as border and accent to Kernel tokens and would restyle your shadcn components. Docs: ${homepage}/installation/#shadcn`,
    categories: ["setup"],
    meta: { docsUrl: `${homepage}/installation/` },
  };
}

function componentItem(entry, modules) {
  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: entry.slug,
    type: "registry:ui",
    title: entry.name,
    description: entry.summary,
    author,
    dependencies: ["@kernelui-lib/react"],
    registryDependencies: [`${baseUrl}/r/${setupItem}.json`],
    files: [
      {
        path: `registry/kernel-ui/${entry.slug}.tsx`,
        content: componentFile(entry, modules),
        type: "registry:ui",
        target: `@components/kernel/${entry.slug}.tsx`,
      },
    ],
    docs: `${entry.name} is imported from "@kernelui-lib/react" (re-exported by components/kernel/${entry.slug}.tsx). Props: ${entry.docsUrl}`,
    categories: [slugToCategory(entry.category)],
    meta: {
      docsUrl: entry.docsUrl,
      element: entry.element,
      reactExports: entry.reactExports,
      elementTag: entry.elementTag,
      ...(entry.shadcnAliases?.length ? { shadcnAliases: entry.shadcnAliases } : {}),
    },
  };
}

async function main() {
  const modules = await readReactExports();
  const available = components.filter((entry) => entry.status === "available");
  const items = [setup(), ...available.map((entry) => componentItem(entry, modules))];

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  for (const item of items) {
    await writeFile(path.join(outDir, `${item.name}.json`), `${JSON.stringify(item, null, 2)}\n`);
  }

  // The index lists every item without file contents, as `shadcn build` does;
  // the CLI and MCP fetch <name>.json for the payload.
  const index = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "kernel-ui",
    homepage,
    items: items.map(({ $schema: _schema, files, ...item }) => ({
      ...item,
      ...(files ? { files: files.map(({ content: _content, ...file }) => file) } : {}),
    })),
  };
  await writeFile(path.join(outDir, "registry.json"), `${JSON.stringify(index, null, 2)}\n`);

  console.log(`[shadcn-registry] wrote public/r/registry.json and ${items.length} items (base ${baseUrl})`);
}

await main();
