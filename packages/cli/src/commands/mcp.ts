import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { startServer } from "../lib/mcp-server.js";
import { info, log, success } from "../lib/output.js";
import type { GlobalOptions } from "../lib/types.js";

const SERVER = { command: "npx", args: ["-y", "@kernelui-lib/cli", "mcp"] };

/** Where each JSON-config client reads project-level MCP config, and the shape it wants. */
const CLIENTS = {
  claude: { file: ".mcp.json", key: "mcpServers", entry: SERVER },
  cursor: { file: ".cursor/mcp.json", key: "mcpServers", entry: SERVER },
  vscode: { file: ".vscode/mcp.json", key: "servers", entry: { type: "stdio", ...SERVER } },
} as const;

/** Codex reads TOML, not JSON: a [mcp_servers.<name>] table in
 * .codex/config.toml (project scope, used once the project is trusted) or
 * ~/.codex/config.toml. */
const CODEX_FILE = ".codex/config.toml";
const CODEX_BLOCK = `[mcp_servers.kernel]
command = "npx"
args = ["-y", "@kernelui-lib/cli", "mcp"]
`;

type Client = keyof typeof CLIENTS | "codex";
const CLIENT_NAMES = [...Object.keys(CLIENTS), "codex"];

/** Replaces our own [mcp_servers.kernel] table (and nothing else), or appends it. */
export function mergeCodexToml(existing: string) {
  const lines = existing.split("\n");
  const start = lines.findIndex((line) => line.trim() === "[mcp_servers.kernel]");
  if (start === -1) return `${existing.trimEnd()}${existing.trim() ? "\n\n" : ""}${CODEX_BLOCK}`;
  let end = start + 1;
  // A sub-table of ours ([mcp_servers.kernel.env]) belongs to the block too.
  while (end < lines.length && !(/^\s*\[/.test(lines[end]!) && !/^\s*\[mcp_servers\.kernel\./.test(lines[end]!))) end++;
  const after = lines.slice(end).join("\n").replace(/^\n+/, "");
  return [...lines.slice(0, start), CODEX_BLOCK.trimEnd(), ...(after ? ["", after] : [])].join("\n").trimEnd() + "\n";
}

async function initCodex(global: GlobalOptions) {
  const file = path.join(global.cwd, CODEX_FILE);
  const next = mergeCodexToml(existsSync(file) ? await readFile(file, "utf8") : "");
  if (global.dryRun) {
    info(`Would write ${CODEX_FILE}:`);
    log(next);
    return;
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, next, "utf8");
  success(`Added the Kernel MCP server to ${CODEX_FILE}`);
  info("Codex loads project config once you trust the project. Restart Codex to pick it up.");
}

async function version() {
  const pkg = await import("../../package.json", { with: { type: "json" } });
  return pkg.default.version as string;
}

export async function initMcp(global: GlobalOptions, rest: string[]) {
  const flag = rest.find((arg) => arg.startsWith("--client"));
  const client = !flag ? "claude" : flag.includes("=") ? flag.split("=")[1]! : (rest[rest.indexOf(flag) + 1] ?? "claude");
  if (!CLIENT_NAMES.includes(client)) {
    throw new Error(`Unknown client "${client}". Use one of: ${CLIENT_NAMES.join(", ")}.`);
  }
  if (client === "codex") return initCodex(global);
  const target = CLIENTS[client as keyof typeof CLIENTS];
  const file = path.join(global.cwd, target.file);

  // Merge into an existing config rather than replacing other servers.
  let config: Record<string, Record<string, unknown>> = {};
  if (existsSync(file)) {
    try {
      config = JSON.parse(await readFile(file, "utf8"));
    } catch {
      throw new Error(`${target.file} exists but isn't valid JSON; fix it and run again.`);
    }
  }
  config[target.key] = { ...(config[target.key] ?? {}), kernel: target.entry };

  if (global.dryRun) {
    info(`Would write ${target.file}:`);
    log(JSON.stringify(config, null, 2));
    return;
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  success(`Added the Kernel MCP server to ${target.file}`);
  info("Restart your editor or agent session to load it.");
}

export async function runMcp(global: GlobalOptions, rest: string[]) {
  if (rest[0] === "init") {
    await initMcp(global, rest.slice(1));
    return;
  }
  startServer(await version());
}
