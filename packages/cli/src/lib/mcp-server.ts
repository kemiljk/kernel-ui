/**
 * `kernel mcp`: a Model Context Protocol server over stdio, so coding agents
 * can look Kernel up instead of guessing. Exact props come from source
 * (registry/scripts/extract-api.mjs), bundled into the CLI so answers match
 * the installed version and work offline.
 *
 * Hand-rolled JSON-RPC rather than the MCP SDK: the protocol surface a tools
 * server needs is four methods, and Kernel's packages ship with no runtime
 * dependencies. Messages are newline-delimited JSON on stdin/stdout; nothing
 * else may be written to stdout, so diagnostics go to stderr.
 */
import { createInterface } from "node:readline";
import {
  conventions,
  describeComponent,
  findComponent,
  findTokens,
  listComponents,
  searchComponents,
  type Platform,
} from "./agent.js";
import { checkCode, formatFindings } from "./check.js";

const PROTOCOL_VERSION = "2025-06-18";

interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (args: Record<string, unknown>) => string;
}

const platformSchema = {
  type: "string",
  enum: ["react", "elements", "both"],
  description: "Which package to describe. Defaults to both.",
};

export const tools: Tool[] = [
  {
    name: "list_components",
    description:
      "List every Kernel UI component with its category and one-line summary. Call this first to see what exists before writing UI.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Optional filter: Primitives, Forms, Layout, Feedback, Overlays, Navigation, Data Display or AI.",
        },
      },
    },
    run: ({ category }) =>
      listComponents(category as string | undefined)
        .map((c) => `- ${c.name} (${c.slug}, ${c.category}): ${c.summary}`)
        .join("\n") || "No components in that category.",
  },
  {
    name: "search_components",
    description:
      "Find the Kernel component for a need described in plain words (e.g. 'tool call approval', 'date range', 'shadcn sheet').",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    run: ({ query }) => {
      const results = searchComponents(String(query ?? ""));
      return results.length
        ? results.map((c) => `- ${c.name} (${c.slug}): ${c.summary}`).join("\n")
        : "No match. Call list_components to see everything.";
    },
  },
  {
    name: "get_component",
    description:
      "Exact API for one component: React props (types, defaults, notes), custom element attributes and events, why it's built on its native element, and shadcn/Radix migration notes. Accepts a name, slug, export or shadcn alias.",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string" }, platform: platformSchema },
      required: ["name"],
    },
    run: ({ name, platform }) => {
      const entry = findComponent(String(name ?? ""));
      if (!entry) return `No component called "${name}". Try search_components.`;
      return describeComponent(entry, (platform as Platform | undefined) ?? "both");
    },
  },
  {
    name: "get_tokens",
    description:
      "Kernel's design tokens (CSS custom properties) with values and what each is for. Use these instead of raw colours, spacing or radii.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Filter, e.g. 'color', 'radius', 'space', 'icon'." } },
    },
    run: ({ query }) => {
      const found = findTokens(query as string | undefined);
      if (found.length === 0) return "No tokens match.";
      return found.map((t) => `- \`${t.name}: ${t.value}\`${t.note ? ` — ${t.note.slice(0, 160)}` : ""}`).join("\n");
    },
  },
  {
    name: "get_conventions",
    description:
      "How to install Kernel and the conventions every component shares (controlled state, form-field scaffold, className hooks, icons). Read once before writing Kernel code.",
    inputSchema: { type: "object", properties: { platform: { ...platformSchema, enum: ["react", "elements"] } } },
    run: ({ platform }) => (platform === "elements" ? conventions.elements : conventions.react),
  },
  {
    name: "check_code",
    description:
      "Review JSX, HTML or CSS written against Kernel: unknown or foreign props (asChild, leftIcon…), missing field labels, unlabelled icon-only buttons, clickable divs, raw colours, hand-picked radii, and shadcn/Radix imports Kernel replaces. Run it after writing code and fix what it reports.",
    inputSchema: { type: "object", properties: { code: { type: "string" } }, required: ["code"] },
    run: ({ code }) => formatFindings(checkCode(String(code ?? ""))),
  },
];

interface Request {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

/** Handles one JSON-RPC message; returns the response, or null for a notification. */
export function handleMessage(message: Request, version: string): Record<string, unknown> | null {
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id: message.id ?? null, result });
  const fail = (code: number, text: string) => ({ jsonrpc: "2.0", id: message.id ?? null, error: { code, message: text } });
  const isNotification = message.id === undefined;

  switch (message.method) {
    case "initialize": {
      const requested = message.params?.protocolVersion;
      return reply({
        protocolVersion: typeof requested === "string" ? requested : PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "kernel-ui", title: "Kernel UI", version },
        instructions:
          "Kernel UI components are built on real semantic HTML, in React (@kernelui-lib/react) and Custom Elements (@kernelui-lib/elements). Before writing UI: call get_conventions once, search_components or list_components to pick components, and get_component for exact props. Style only with Kernel tokens (get_tokens). After writing code, run check_code and fix what it reports.",
      });
    }
    case "ping":
      return reply({});
    case "tools/list":
      return reply({
        tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      });
    case "tools/call": {
      const name = message.params?.name;
      const tool = tools.find((t) => t.name === name);
      if (!tool) return fail(-32602, `Unknown tool: ${String(name)}`);
      try {
        const text = tool.run((message.params?.arguments as Record<string, unknown>) ?? {});
        return reply({ content: [{ type: "text", text }] });
      } catch (error) {
        return reply({ content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }], isError: true });
      }
    }
    default:
      if (isNotification) return null; // notifications/initialized and friends
      return fail(-32601, `Method not found: ${message.method}`);
  }
}

export function startServer(version: string) {
  const rl = createInterface({ input: process.stdin });
  rl.on("line", (line) => {
    if (!line.trim()) return;
    let message: Request;
    try {
      message = JSON.parse(line) as Request;
    } catch {
      process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } })}\n`);
      return;
    }
    const response = handleMessage(message, version);
    if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
  });
  process.stderr.write(`kernel-ui MCP server ${version} ready on stdio\n`);
}
