import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { run, shellQuote } from "./util.mjs";

/** Appended to every task prompt: what the project is, without hinting at Kernel's answers. */
export function buildPrompt(task) {
  const project =
    task.package === "elements"
      ? "a Vite + TypeScript app with no framework: the page is index.html and its script is src/main.ts, which already imports @kernelui-lib/elements and its styles"
      : "a Vite + React + TypeScript app: src/main.tsx already imports Kernel's styles and renders src/App.tsx";
  return `${task.prompt}

---
The project in the current directory is ${project}. Dependencies are installed (@kernelui-lib/react, @kernelui-lib/elements, @kernelui-lib/styles, lucide-react); don't install anything else. Build the UI there (you can add files under src/). Scripts: npm run typecheck, npm run lint, npm run build. Don't start a dev server or ask questions; you're done when the UI is built.`;
}

/**
 * The default agent: Claude Code in print mode, streaming JSON so tool
 * calls can be counted. Only project settings load (not the user's own
 * settings, plugins or MCP servers), and only the project's .mcp.json is
 * used. Edits are auto-accepted; shell access is limited to the project's
 * own scripts and Kernel's CLI.
 */
export function defaultClaudeCommand({ model, budget, dir }) {
  const allowed = [
    "Bash(npm run *)",
    "Bash(npx tsc *)",
    "Bash(npx eslint *)",
    "Bash(npx kernel *)",
    "Bash(npx @kernelui-lib/cli *)",
    "Bash(ls *)",
    "Bash(cat *)",
    "Bash(grep *)",
    "mcp__kernel",
    "WebFetch(domain:www.kernelui.com)",
  ];
  const parts = [
    "claude -p",
    model ? `--model ${shellQuote(model)}` : "",
    "--output-format stream-json --verbose",
    "--permission-mode acceptEdits",
    "--setting-sources project,local",
    "--no-session-persistence",
    budget ? `--max-budget-usd ${Number(budget)}` : "",
    existsSync(join(dir, ".mcp.json")) ? "--strict-mcp-config --mcp-config .mcp.json" : "--strict-mcp-config",
    `--allowedTools ${allowed.map(shellQuote).join(" ")}`,
  ];
  return parts.filter(Boolean).join(" ");
}

/**
 * Codex CLI's equivalent (`--agent codex`): workspace-write sandbox, no
 * session files, and not the user's own config.toml (auth still works), so
 * their MCP servers stay out. The project's `.codex/config.toml` only loads
 * for a trusted project, so the kernel MCP server is passed with `-c`
 * instead, pointed at the workspace CLI build (the MCP server's cwd is the
 * project) and pre-approved: `codex exec` never asks, so without
 * `default_tools_approval_mode` every MCP call fails.
 */
export function defaultCodexCommand({ model }) {
  return [
    "codex exec --sandbox workspace-write --skip-git-repo-check --ephemeral --ignore-user-config",
    model ? `--model ${shellQuote(model)}` : "",
    shellQuote("-c") + " " + shellQuote('mcp_servers.kernel.command="node"'),
    shellQuote("-c") + " " + shellQuote('mcp_servers.kernel.args=["node_modules/@kernelui-lib/cli/dist/index.js","mcp"]'),
    shellQuote("-c") + " " + shellQuote('mcp_servers.kernel.default_tools_approval_mode="approve"'),
    "--json -",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Runs the agent command in the project directory. `{dir}`, `{prompt}` and
 * `{prompt_file}` in the command are replaced (shell-quoted); with no
 * `{prompt}`/`{prompt_file}` the prompt is piped to stdin, which both
 * `claude -p` and `codex exec -` read.
 */
export async function runAgent({ command, prompt, dir, timeoutMs, logDir }) {
  const promptFile = join(logDir, "prompt.md");
  writeFileSync(promptFile, prompt);
  const usesPrompt = /\{prompt(_file)?\}/.test(command);
  const resolved = command
    .replaceAll("{dir}", shellQuote(dir))
    .replaceAll("{prompt_file}", shellQuote(promptFile))
    .replaceAll("{prompt}", shellQuote(prompt));
  const result = await run(resolved, [], { cwd: dir, shell: true, input: usesPrompt ? null : prompt, timeoutMs });
  writeFileSync(join(logDir, "agent.stdout.log"), result.stdout);
  writeFileSync(join(logDir, "agent.stderr.log"), result.stderr);
  return {
    command: resolved.replace(shellQuote(prompt), "{prompt}"),
    exitCode: result.code,
    timedOut: result.timedOut,
    durationMs: result.durationMs,
    stderrTail: result.stderr.trim().split("\n").slice(-5).join("\n").slice(0, 600),
    ...analyseTranscript(result.stdout),
  };
}

/**
 * Best-effort read of what the agent did, from Claude Code's stream-json
 * (tool_use blocks and the final result event) or, for other agents, from
 * JSON events / plain text that mention the same things. Nothing here is
 * scored; it's reported so a regression in Kernel's MCP, skills or llms.txt
 * shows up as "agents stopped using it".
 */
export function analyseTranscript(stdout) {
  const tools = [];
  let result = null;
  let init = null;
  const codexItems = new Map();
  const usage = {};
  let codexTurns = 0;
  let lastMessage = null;
  for (const line of stdout.split("\n")) {
    if (!line.startsWith("{")) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === "system" && event.subtype === "init") init = event;
    if (event.type === "result") result = event;
    if (event.type === "assistant") {
      for (const block of event.message?.content ?? []) {
        if (block.type === "tool_use") tools.push({ name: block.name, input: block.input ?? {} });
      }
    }
    // Codex `exec --json`: each item arrives as item.started and again as
    // item.completed (same id); count it once, from the latest event, so a
    // failed call (e.g. an MCP tool blocked by the approval policy) shows.
    const item = event.item ?? event.msg;
    if (item?.type === "mcp_tool_call" || item?.type === "command_execution") {
      const entry =
        item.type === "mcp_tool_call"
          ? { name: `mcp__${item.server}__${item.tool}`, input: item.arguments ?? {}, failed: Boolean(item.error) || item.status === "failed" }
          : { name: "Bash", input: { command: item.command } };
      const index = item.id != null ? codexItems.get(item.id) : undefined;
      if (index === undefined) {
        if (item.id != null) codexItems.set(item.id, tools.length);
        tools.push(entry);
      } else tools[index] = entry;
    }
    if (item?.type === "agent_message" && typeof item.text === "string") lastMessage = item.text;
    if (event.type === "turn.completed" && event.usage) {
      for (const [key, value] of Object.entries(event.usage)) if (typeof value === "number") usage[key] = (usage[key] ?? 0) + value;
      codexTurns += 1;
    }
  }
  const text = (t) => JSON.stringify(t.input);
  const kernelMcp = tools.filter((t) => t.name.startsWith("mcp__kernel__") && !t.failed).map((t) => t.name.replace("mcp__kernel__", ""));
  const counts = (list) => Object.fromEntries([...new Set(list)].map((n) => [n, list.filter((x) => x === n).length]));
  const fallback = tools.length === 0 ? stdout : "";
  return {
    tools: {
      total: tools.length,
      byName: counts(tools.map((t) => t.name)),
      kernelMcp: counts(kernelMcp),
      failed: tools.filter((t) => t.failed).length,
      usedKernelMcp: kernelMcp.length > 0 || /mcp__kernel__|kernel\.(get_component|search_components)/.test(fallback),
      usedSkill: tools.some((t) => (t.name === "Skill" && /kernel/.test(text(t))) || /skills[/\\]kernel-ui/.test(text(t))),
      readLlmsTxt: tools.some((t) => /llms(-full)?\.txt/.test(text(t))) || /llms(-full)?\.txt/.test(fallback),
      readTypes: tools.some((t) => /index\.d\.ts/.test(text(t))),
      ranKernelCheck: tools.some((t) => /kernel(ui-lib\/cli)? check|check_code/.test(t.name + text(t))),
      ranLint: tools.some((t) => t.name === "Bash" && /eslint|npm run lint/.test(text(t))),
      ranTypecheck: tools.some((t) => t.name === "Bash" && /\btsc\b|npm run typecheck|npm run build/.test(text(t))),
    },
    session: init
      ? { model: init.model, mcpServers: init.mcp_servers, skills: init.skills ?? null, plugins: init.plugins ?? null }
      : null,
    costUsd: result?.total_cost_usd ?? null,
    turns: result?.num_turns ?? (codexTurns || null),
    // Token usage: Claude Code's result event, or summed Codex turn.completed events.
    usage: result?.usage ?? (Object.keys(usage).length ? usage : null),
    resultText: (typeof result?.result === "string" ? result.result : lastMessage)?.slice(0, 2000) ?? null,
    isError: result?.is_error ?? null,
  };
}
