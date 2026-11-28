/**
 * Agent-facing data for `kernel mcp`: each component's exact API, the design
 * tokens, and the cross-component conventions, all bundled at build time
 * (scripts/bundle-registry.mjs) so answers match the installed version and
 * work offline.
 */
import { createRequire } from "node:module";
import { components, findComponent, type RegistryEntry } from "./registry.js";

export interface PropInfo {
  name: string;
  type: string;
  optional: boolean;
  default?: string;
  description?: string;
}

export interface ComponentApi {
  name: string;
  react: Record<string, { description?: string; extends: string[]; props: PropInfo[] }>;
  elements: Record<string, ElementApi>;
}

export interface ElementApi {
  description?: string;
  attributes: string[];
  /** The ARIA attributes the host hands to its native control. */
  forwardedAttributes?: string[];
  /** CustomEvent names, as dispatched. */
  events: string[];
  /** Every dispatched event (CustomEvent or plain Event) and its `detail`
   * type, or `null` for none. */
  eventDetails?: Record<string, string | null>;
}

export interface TokenInfo {
  name: string;
  value: string;
  note?: string;
}

interface AgentBundle {
  api: Record<string, ComponentApi>;
  tokens: TokenInfo[];
  conventions: { react: string; elements: string };
}

const require = createRequire(import.meta.url);
let bundle: AgentBundle;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- bundle-generated
  bundle = require("../agent-bundle.cjs") as AgentBundle;
} catch (error) {
  throw new Error(
    "[kernel] Agent data missing (dist/agent-bundle.cjs). This is a packaging fault — " +
      "please report it at https://github.com/kemiljk/kernel-ui/issues.",
    { cause: error },
  );
}

export const api = bundle.api;
export const tokens = bundle.tokens;
export const conventions = bundle.conventions;

export type Platform = "react" | "elements" | "both";

export function listComponents(category?: string) {
  return components
    .filter((entry) => entry.status === "available")
    .filter((entry) => !category || entry.category.toLowerCase() === category.toLowerCase());
}

/** Ranks components by how well they match a free-text need. */
export function searchComponents(query: string, limit = 8) {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 1);
  const scored = components
    .filter((entry) => entry.status === "available")
    .map((entry) => {
      const componentApi = api[entry.slug];
      const haystacks: [string, number][] = [
        [entry.name.toLowerCase(), 6],
        [entry.reactExports.join(" ").toLowerCase(), 5],
        [(entry.shadcnAliases ?? []).join(" ").toLowerCase(), 5],
        [entry.element.toLowerCase(), 3],
        [entry.summary.toLowerCase(), 3],
        [(entry.llmsNote ?? "").toLowerCase(), 1],
        [
          Object.values(componentApi?.react ?? {})
            .flatMap((r) => r.props.map((p) => p.name))
            .join(" ")
            .toLowerCase(),
          1,
        ],
      ];
      let score = 0;
      for (const word of words) for (const [text, weight] of haystacks) if (text.includes(word)) score += weight;
      return { entry, score };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((result) => result.entry);
}

function propsTable(props: PropInfo[]) {
  if (props.length === 0) return "_No props of its own; takes the native element's attributes._\n";
  const rows = props.map((p) => {
    const description = (p.description ?? "").replace(/\s+/g, " ").replace(/\|/g, "\\|");
    return `| \`${p.name}${p.optional ? "?" : ""}\` | \`${p.type.replace(/\|/g, "\\|")}\` | ${p.default ? `\`${p.default}\`` : ""} | ${description} |`;
  });
  return ["| Prop | Type | Default | Notes |", "| --- | --- | --- | --- |", ...rows, ""].join("\n");
}

/** Full markdown reference for one component, as an agent should read it. */
export function describeComponent(entry: RegistryEntry, platform: Platform = "both") {
  const componentApi = api[entry.slug];
  const lines = [`# ${entry.name}`, "", entry.summary, ""];
  if (entry.llmsNote) lines.push(entry.llmsNote, "");
  lines.push(`- Native element: ${entry.element}`, `- Docs: ${entry.docsUrl} (markdown: ${entry.docsUrl.replace(/\/$/, "")}.md)`, "");

  if (platform !== "elements") {
    lines.push("## React (`@kernelui-lib/react`)", "");
    lines.push(`\`import { ${entry.reactExports.join(", ")} } from "@kernelui-lib/react";\``, "");
    for (const [name, info] of Object.entries(componentApi?.react ?? {})) {
      lines.push(`### ${name}`, "");
      if (info.description) lines.push(info.description, "");
      if (info.extends.length) lines.push(`Also accepts: \`${info.extends.join("`, `")}\``, "");
      lines.push(propsTable(info.props));
    }
  }
  if (platform !== "react") {
    lines.push("## Web Components (`@kernelui-lib/elements`)", "");
    for (const [tag, info] of Object.entries(componentApi?.elements ?? {})) {
      lines.push(`### \`<${tag}>\``, "");
      if (info.description) lines.push(info.description, "");
      lines.push(`- Attributes: ${info.attributes.length ? info.attributes.map((a) => `\`${a}\``).join(", ") : "none"}`);
      if (info.forwardedAttributes?.length) {
        lines.push(
          `- Forwarded to the native control: ${info.forwardedAttributes.map((a) => `\`${a}\``).join(", ")} (set them on the tag; they name or describe the real control inside it)`,
        );
      }
      const details = Object.entries(info.eventDetails ?? {});
      if (details.length) {
        lines.push("- Events:");
        for (const [name, detail] of details) {
          lines.push(`  - \`${name}\`: ${detail ? `\`event.detail\` is \`${detail}\`` : "plain event, no `detail`"}`);
        }
      } else if (info.events.length) {
        lines.push(`- Events: ${info.events.map((e) => `\`${e}\``).join(", ")}`);
      }
      lines.push("");
    }
  }
  if (entry.migrationCaveats?.length) {
    lines.push("## Migrating from shadcn/Radix", "", ...entry.migrationCaveats.map((c) => `- ${c}`), "");
  }
  return lines.join("\n");
}

export function findTokens(query?: string) {
  if (!query) return tokens;
  const q = query.toLowerCase();
  // Name matches first: "radius" should list the radius tokens, not every
  // token whose note happens to mention radius. Fall back to values/notes.
  const byName = tokens.filter((t) => t.name.includes(q));
  if (byName.length) return byName;
  return tokens.filter((t) => t.value.toLowerCase().includes(q) || (t.note ?? "").toLowerCase().includes(q));
}

export { findComponent };
