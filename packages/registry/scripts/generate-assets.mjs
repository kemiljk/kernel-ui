import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES, components } from "../dist/components.js";

const root = path.join(fileURLToPath(import.meta.url), "..", "..");
const reactLlmsPath = path.join(root, "..", "react", "llms.txt");
const elementsLlmsPath = path.join(root, "..", "elements", "llms.txt");
const registryJsonPath = path.join(root, "dist", "registry.json");
const docsPublicPath = path.join(root, "..", "..", "apps", "docs", "public", "registry.json");

const START = "<!-- GENERATED:COMPONENTS:START -->";
const END = "<!-- GENERATED:COMPONENTS:END -->";

function formatReactComponentLine(entry) {
  const primary = entry.reactExports[0];
  const exportText =
    entry.reactExports.length === 1
      ? `**${primary}**`
      : `**${primary}** (+ \`${entry.reactExports.slice(1).join("`, `")}\`)`;
  // `llmsNote` is the only place long-form prose about a component can live and
  // survive: this whole section is regenerated from the registry on every build,
  // so anything hand-written into llms.txt between the markers gets deleted.
  const detail = entry.llmsNote ? `${entry.summary} ${entry.llmsNote}` : entry.summary;
  return `- ${exportText} — ${detail}`;
}

function formatElementsTagLine(entry) {
  const tag = entry.elementTag;
  if (entry.elementSubTags?.length) {
    const subs = entry.elementSubTags.join("`/`");
    return `\`${tag}\` (+ \`${subs}\`)`;
  }
  return `\`${tag}\``;
}

function generateReactComponentsSection() {
  const lines = ["## Components", ""];
  for (const category of CATEGORIES) {
    const items = components.filter((c) => c.category === category && c.status === "available");
    if (items.length === 0) continue;
    lines.push(`### ${category}`);
    for (const entry of items) {
      lines.push(formatReactComponentLine(entry));
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

function generateElementsTagsSection() {
  const lines = [
    "## Tags (grouped to match @kernelui-lib/react's component groups; composite",
    "## components' sub-tags are one level deeper, e.g. <kernel-card-header>",
    "## goes inside <kernel-card>)",
    "",
  ];
  for (const category of CATEGORIES) {
    const items = components.filter((c) => c.category === category && c.status === "available");
    if (items.length === 0) continue;
    const tags = items.map((entry) => formatElementsTagLine(entry)).join(", ");
    lines.push(`- ${category}: ${tags}`);
  }
  lines.push("");
  return lines.join("\n").trimEnd();
}

async function replaceGeneratedSection(filePath, generated) {
  const content = await readFile(filePath, "utf-8");
  const startIdx = content.indexOf(START);
  const endIdx = content.indexOf(END);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Missing generation markers in ${filePath}`);
  }
  const before = content.slice(0, startIdx + START.length);
  const after = content.slice(endIdx);
  const updated = `${before}\n${generated}\n${after}`;
  await writeFile(filePath, updated, "utf-8");
}

async function main() {
  await mkdir(path.dirname(registryJsonPath), { recursive: true });

  const registry = {
    version: 1,
    generatedAt: new Date().toISOString(),
    components: components.map((entry) => ({
      name: entry.name,
      category: entry.category,
      slug: entry.slug,
      element: entry.element,
      summary: entry.summary,
      status: entry.status,
      reactExports: entry.reactExports,
      elementTag: entry.elementTag,
      elementSubTags: entry.elementSubTags ?? [],
      docsUrl: entry.docsUrl,
      shadcnAliases: entry.shadcnAliases ?? [],
      radixPackages: entry.radixPackages ?? [],
      migrationCaveats: entry.migrationCaveats ?? [],
    })),
  };

  const json = `${JSON.stringify(registry, null, 2)}\n`;
  await writeFile(registryJsonPath, json, "utf-8");
  await mkdir(path.dirname(docsPublicPath), { recursive: true });
  await writeFile(docsPublicPath, json, "utf-8");

  await replaceGeneratedSection(reactLlmsPath, generateReactComponentsSection());
  await replaceGeneratedSection(elementsLlmsPath, generateElementsTagsSection());

  console.log(
    `[generate-assets] wrote registry.json (${registry.components.length} components), updated llms.txt files`,
  );
}

await main();
