import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { startServer } from "../lib/mcp-server.js";
import { info, log, success } from "../lib/output.js";
import type { GlobalOptions } from "../lib/types.js";

const SERVER = { command: "npx", args: ["-y", "@kernelui-lib/cli", "mcp"] };

/** Where each client reads project-level MCP config, and the shape it wants. */
const CLIENTS = {
  claude: { file: ".mcp.json", key: "mcpServers", entry: SERVER },
  cursor: { file: ".cursor/mcp.json", key: "mcpServers", entry: SERVER },
  vscode: { file: ".vscode/mcp.json", key: "servers", entry: { type: "stdio", ...SERVER } },
} as const;

type Client = keyof typeof CLIENTS;

async function version() {
  const pkg = await import("../../package.json", { with: { type: "json" } });
  return pkg.default.version as string;
}

export async function initMcp(global: GlobalOptions, rest: string[]) {
  const flag = rest.find((arg) => arg.startsWith("--client"));
  const client = !flag ? "claude" : flag.includes("=") ? flag.split("=")[1]! : (rest[rest.indexOf(flag) + 1] ?? "claude");
  if (!(client in CLIENTS)) {
    throw new Error(`Unknown client "${client}". Use one of: ${Object.keys(CLIENTS).join(", ")}.`);
  }
  const target = CLIENTS[client as Client];
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
