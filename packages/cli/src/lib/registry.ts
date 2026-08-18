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

/* `.cjs` because the generated bundle is CommonJS and this package is
   "type": "module" — a bare `.js` would be parsed as ESM and throw.

   The catch deliberately does NOT substitute empty data any more. It used
   to, and that is exactly how a bundle that could not be loaded at all
   shipped as a working build: the ReferenceError was swallowed, every
   lookup quietly returned undefined, and the CLI looked merely unhelpful
   rather than broken. A missing catalog is not a recoverable state for a
   CLI whose whole job is looking components up — fail loudly, at load. */
let registryModule;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- bundle-generated
  registryModule = require("../registry-bundle.cjs");
} catch (error) {
  throw new Error(
    "[kernel] Component catalog missing or unloadable (dist/registry-bundle.cjs). " +
      "This is a packaging fault, not a user error — please report it at " +
      "https://github.com/kemiljk/kernel-ui/issues.",
    { cause: error },
  );
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
