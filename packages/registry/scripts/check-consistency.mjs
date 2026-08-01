import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { components } from "../dist/components.js";

const root = path.join(fileURLToPath(import.meta.url), "..", "..", "..");

async function readExports(filePath) {
  const content = await readFile(filePath, "utf-8");
  const exports = new Set();
  const exportBlocks = content.matchAll(/export\s*\{([^}]+)\}/gs);
  for (const match of exportBlocks) {
    for (const part of match[1].split(",")) {
      const cleaned = part.trim();
      if (!cleaned || cleaned.startsWith("type ")) continue;
      const name = cleaned.split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Za-z]/.test(name)) exports.add(name);
    }
  }
  return exports;
}

function toPascalCase(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

const ELEMENT_OVERRIDES = {
  "dropdown-menu": "KernelDropdownMenu",
  "navigation-menu": "KernelNavigationMenu",
  "command-palette": "KernelCommandPalette",
  "context-menu": "KernelContextMenu",
  "hover-card": "KernelHoverCard",
  "date-picker": "KernelDatePicker",
  "date-range-picker": "KernelDateRangePicker",
  "data-table": "KernelDataTable",
  "input-otp": "KernelInputOTP",
  "radio-group": "KernelRadioGroup",
  "scroll-area": "KernelScrollArea",
  "tag-input": "KernelTagInput",
  "text-field": "KernelTextField",
  "number-field": "KernelNumberField",
  "color-picker": "KernelColorPicker",
  "file-upload": "KernelFileUpload",
  "thinking-indicator": "KernelThinkingIndicator",
  toast: "KernelToastViewport",
};

async function main() {
  const reactIndex = path.join(root, "react", "src", "index.ts");
  const elementsIndex = path.join(root, "elements", "src", "index.ts");
  const docsComponentsDir = path.join(root, "..", "apps", "docs", "src", "pages", "components");

  const reactExports = await readExports(reactIndex);
  const elementsExports = await readExports(elementsIndex);

  const errors = [];

  for (const entry of components) {
    if (entry.status !== "available") continue;

    for (const exportName of entry.reactExports) {
      if (!reactExports.has(exportName)) {
        errors.push(`React export missing: ${exportName} (${entry.slug})`);
      }
    }

    const expectedClass = ELEMENT_OVERRIDES[entry.slug] ?? `Kernel${toPascalCase(entry.slug)}`;
    if (!elementsExports.has(expectedClass)) {
      errors.push(`Elements export missing: ${expectedClass} (${entry.slug})`);
    }

    const docsPage = path.join(docsComponentsDir, `${entry.slug}.astro`);
    try {
      await readFile(docsPage, "utf-8");
    } catch {
      errors.push(`Docs page missing: ${entry.slug}.astro`);
    }
  }

  const registryJson = path.join(root, "registry", "dist", "registry.json");
  try {
    const json = JSON.parse(await readFile(registryJson, "utf-8"));
    if (json.components.length !== components.filter((c) => c.status === "available").length) {
      errors.push("registry.json is out of date — run bun run generate in packages/registry");
    }
  } catch {
    errors.push("registry.json missing — run bun run build in packages/registry");
  }

  if (errors.length > 0) {
    console.error("[check-consistency] failed:\n" + errors.map((e) => `  - ${e}`).join("\n"));
    process.exit(1);
  }

  console.log(`[check-consistency] ok (${components.length} registry entries)`);
}

await main();
