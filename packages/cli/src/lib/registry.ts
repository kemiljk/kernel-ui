/**
 * Bundled component catalog — generated at build time so the CLI runs standalone.
 *
 * At build, bundle-registry.mjs writes dist/registry-bundle.js (the actual data)
 * and src/lib/registry-bundle.d.ts (type declarations for TypeScript). This file
 * reads from the bundled output via dynamic import so the types resolve cleanly
 * without needing a workspace dependency on @kernelui-lib/registry.
 */

// ── Type definitions ────────────────────────────────────────────────────────
export interface RegistryEntry {
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

// ── Runtime data (populated by bundle-registry.mjs at build time) ───────────
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// Try the bundled ESM output first, then fall back to CJS.
let registryModule;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- bundle-generated
  registryModule = require("../registry-bundle.js");
} catch {
  // Fallback: if dist hasn't been built yet, provide empty data.
  registryModule = { components: [], getComponentBySlug: () => undefined };
}
type Mod = { components: RegistryEntry[]; getComponentBySlug: (slug: string) => RegistryEntry | undefined };
const mod = registryModule as Mod;
export const components = mod.components;
export const getComponentBySlug = mod.getComponentBySlug;

export function findComponent(query: string): RegistryEntry | undefined {
  const normalized = query.toLowerCase().trim();
  const bySlug = getComponentBySlug(normalized);
  if (bySlug) return bySlug;

  return components.find((entry) => {
    if (entry.name.toLowerCase() === normalized) return true;
    if (entry.reactExports.some((name) => name.toLowerCase() === normalized)) return true;
    if (entry.shadcnAliases?.some((alias) => alias === normalized)) return true;
    return false;
  });
}

export function formatComponentMarkdown(entry: RegistryEntry): string {
  const lines = [
    `# ${entry.name}`,
    "",
    entry.summary,
    "",
    `- Docs: ${entry.docsUrl}`,
    `- Native element: ${entry.element}`,
    `- React exports: \`${entry.reactExports.join("`, `")}\``,
    `- Custom element: \`${entry.elementTag}\``,
  ];

  if (entry.shadcnAliases?.length) {
    lines.push(`- shadcn aliases: ${entry.shadcnAliases.map((a) => `\`${a}\``).join(", ")}`);
  }
  if (entry.radixPackages?.length) {
    lines.push("- Radix packages: " + entry.radixPackages.map((a) => `\`${a}\``).join(", "));
  }
  if (entry.migrationCaveats?.length) {
    lines.push("", "## Migration notes", "");
    for (const caveat of entry.migrationCaveats) {
      lines.push(`- ${caveat}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}
