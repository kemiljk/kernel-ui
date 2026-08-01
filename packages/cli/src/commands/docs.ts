import { components, findComponent, formatComponentMarkdown } from "../lib/registry.js";
import { info, log } from "../lib/output.js";
import type { GlobalOptions } from "../lib/types.js";

export async function runDocs(global: GlobalOptions, rest: string[]) {
  const json = rest.includes("--json");
  const markdown = rest.includes("--markdown");
  const query = rest.find((arg) => !arg.startsWith("-"));

  if (!query) {
    log("Available components:\n");
    for (const entry of components) {
      info(`${entry.slug.padEnd(22)} ${entry.name}`);
    }
    log("");
    info("Run `kernel docs <slug|name|shadcn-alias> [--json|--markdown]` for details.");
    return;
  }

  const entry = findComponent(query);
  if (!entry) {
    throw new Error(`No component found for "${query}". Run \`kernel docs\` to list all components.`);
  }

  if (json) {
    console.log(JSON.stringify(entry, null, 2));
    return;
  }

  if (markdown) {
    console.log(formatComponentMarkdown(entry));
    return;
  }

  log(`${entry.name} (${entry.slug})`);
  info(entry.summary);
  info(`Docs: ${entry.docsUrl}`);
  info(`React: ${entry.reactExports.join(", ")}`);
  info(`Element: ${entry.elementTag}`);
  if (entry.shadcnAliases?.length) {
    info(`shadcn: ${entry.shadcnAliases.join(", ")}`);
  }
  if (entry.migrationCaveats?.length) {
    log("");
    log("Migration notes:");
    for (const caveat of entry.migrationCaveats) {
      info(caveat);
    }
  }
}
