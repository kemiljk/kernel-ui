#!/usr/bin/env node
// Validates the shadcn registry that apps/docs/scripts/generate-shadcn-registry.mjs
// writes to apps/docs/public/r/ against shadcn's published JSON schemas.
//
// The schemas are vendored in scripts/schemas/ (fetched from
// https://ui.shadcn.com/schema/registry.json and registry-item.json) so CI
// doesn't depend on that host being up. Refresh them with:
//   curl -sSL https://ui.shadcn.com/schema/registry.json -o scripts/schemas/shadcn-registry.json
//   curl -sSL https://ui.shadcn.com/schema/registry-item.json -o scripts/schemas/shadcn-registry-item.json
//
// Beyond the schema, it checks that every available component in
// @kernelui-lib/registry has an item, and that every item it lists has a file.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "apps", "docs", "public", "r");
const schemaDir = path.join(root, "scripts", "schemas");
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

// shadcn's schemas declare draft-07 as "https://json-schema.org/draft-07/schema#",
// but Ajv registers its draft-07 meta-schema under the http:// id and won't
// resolve the https one. Ajv's default dialect is draft-07, so drop the key.
const loadSchema = (file) => {
  const { $schema: _dialect, ...schema } = readJson(path.join(schemaDir, file));
  return schema;
};
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(loadSchema("shadcn-registry-item.json"), "https://ui.shadcn.com/schema/registry-item.json");
ajv.addSchema(loadSchema("shadcn-registry.json"), "https://ui.shadcn.com/schema/registry.json");
const validateItem = ajv.getSchema("https://ui.shadcn.com/schema/registry-item.json");
const validateRegistry = ajv.getSchema("https://ui.shadcn.com/schema/registry.json");

let files;
try {
  files = readdirSync(outDir).filter((name) => name.endsWith(".json"));
} catch {
  console.error("[check-shadcn-registry] apps/docs/public/r/ is missing; run `node apps/docs/scripts/generate-shadcn-registry.mjs` first");
  process.exit(1);
}

const errors = [];
const format = (file, validate) =>
  validate.errors.map((error) => `${file}: ${error.instancePath || "/"} ${error.message}`);

if (!files.includes("registry.json")) errors.push("registry.json: missing");
const registry = files.includes("registry.json") ? readJson(path.join(outDir, "registry.json")) : { items: [] };
if (files.includes("registry.json") && !validateRegistry(registry)) errors.push(...format("registry.json", validateRegistry));
if (!registry.name || !registry.homepage) errors.push("registry.json: a root registry needs name and homepage");

for (const file of files.filter((name) => name !== "registry.json")) {
  const item = readJson(path.join(outDir, file));
  if (!validateItem(item)) errors.push(...format(file, validateItem));
  if (`${item.name}.json` !== file) errors.push(`${file}: name "${item.name}" does not match its file name`);
  for (const entry of item.files ?? []) {
    if (typeof entry.content !== "string" || !entry.content) errors.push(`${file}: ${entry.path} has no content`);
  }
}

const itemFiles = new Set(files);
for (const item of registry.items) {
  if (!itemFiles.has(`${item.name}.json`)) errors.push(`registry.json lists ${item.name} but ${item.name}.json is missing`);
}

const catalogue = readJson(path.join(root, "packages", "registry", "dist", "registry.json"));
const listed = new Set(registry.items.map((item) => item.name));
for (const entry of catalogue.components.filter((c) => c.status === "available")) {
  if (!listed.has(entry.slug)) errors.push(`registry.json has no item for ${entry.name} (${entry.slug})`);
}

if (errors.length) {
  console.error(`[check-shadcn-registry] ${errors.length} problem(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`[check-shadcn-registry] registry.json and ${files.length - 1} items valid against shadcn's schemas`);
