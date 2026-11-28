import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkCode } from "../dist/lib/check.js";
import { handleMessage, tools } from "../dist/lib/mcp-server.js";
import { mergeCodexToml, runMcp } from "../dist/commands/mcp.js";

const call = (name: string, args: Record<string, unknown> = {}) =>
  handleMessage({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }, "test") as {
    result: { content: { text: string }[]; isError?: boolean };
  };

describe("MCP protocol", () => {
  it("initialises with tools capability and echoes the requested version", () => {
    const res = handleMessage(
      { jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-03-26" } },
      "1.2.3",
    ) as { result: { protocolVersion: string; capabilities: { tools: object }; serverInfo: { version: string } } };
    expect(res.result.protocolVersion).toBe("2025-03-26");
    expect(res.result.capabilities.tools).toBeDefined();
    expect(res.result.serverInfo.version).toBe("1.2.3");
  });

  it("ignores notifications and rejects unknown methods", () => {
    expect(handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" }, "t")).toBeNull();
    const res = handleMessage({ jsonrpc: "2.0", id: 9, method: "nope" }, "t") as { error: { code: number } };
    expect(res.error.code).toBe(-32601);
  });

  it("lists every tool with a JSON schema", () => {
    const res = handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" }, "t") as {
      result: { tools: { name: string; inputSchema: { type: string } }[] };
    };
    expect(res.result.tools.map((t) => t.name)).toEqual(tools.map((t) => t.name));
    for (const tool of res.result.tools) expect(tool.inputSchema.type).toBe("object");
  });
});

describe("MCP tools", () => {
  it("get_component returns exact props with resolved unions and defaults", () => {
    const text = call("get_component", { name: "button", platform: "react" }).result.content[0]!.text;
    expect(text).toContain('`"primary" \\| "secondary" \\| "ghost" \\| "danger"`');
    expect(text).toContain('`"secondary"`');
    expect(text).not.toContain("Web Components");
  });

  it("get_component describes custom element attributes", () => {
    const text = call("get_component", { name: "dialog", platform: "elements" }).result.content[0]!.text;
    expect(text).toContain("<kernel-dialog>");
    expect(text).toContain("Attributes:");
  });

  it("get_component spells out each element event's detail shape", () => {
    const upload = call("get_component", { name: "file upload", platform: "elements" }).result.content[0]!.text;
    expect(upload).toMatch(/`kernel-file-upload-error`: `event.detail` is `\{ type: "max-files" \| "max-size" \| "accept" \| "directory"; files: File\[\] \}`/);
    expect(upload).toContain("`change`: plain event, no `detail`");
    const tags = call("get_component", { name: "tag input", platform: "elements" }).result.content[0]!.text;
    // Cancelable change events (`emitChange`) add the reason union and the
    // triggering event to the detail.
    expect(tags).toContain(
      '`change`: `event.detail` is `{ tags: string[]; reason: "backspace" | "enter" | "paste" | "remove-button" | "separator"; event?: Event }`',
    );
  });

  it("search_components ranks by meaning words", () => {
    const text = call("search_components", { query: "date range" }).result.content[0]!.text;
    expect(text.split("\n")[0]).toContain("Date Range Picker");
  });

  it("get_tokens filters", () => {
    const text = call("get_tokens", { query: "radius" }).result.content[0]!.text;
    expect(text).toContain("--kernel-radius-control");
    expect(text).not.toMatch(/^- `--kernel-space-unit:/m);
    for (const line of text.split("\n")) expect(line).toMatch(/^- `--kernel-[\w-]*radius/);
  });

  it("reports an unknown component helpfully", () => {
    expect(call("get_component", { name: "Frobnicator" }).result.content[0]!.text).toMatch(/search_components/);
  });
});

describe("check_code", () => {
  const rules = (code: string) => checkCode(code).map((f) => f.rule);

  it("flags foreign props with Kernel's equivalent", () => {
    const [finding] = checkCode("<Button leftIcon={<X />}>Go</Button>");
    expect(finding?.rule).toBe("foreign-prop");
    expect(finding?.message).toContain("iconStart");
  });

  it("flags invalid literal values with a suggestion, but not wild guesses", () => {
    expect(checkCode('<Button variant="primry">Go</Button>')[0]?.message).toContain('"primary"');
    expect(checkCode('<Button size="xl">Go</Button>')[0]?.message).not.toContain("did you mean");
  });

  it("requires labels on fields and names on icon-only buttons", () => {
    expect(rules('<TextField placeholder="Email" />')).toContain("field-label");
    expect(rules('<TextField label="Email" hideLabel />')).not.toContain("field-label");
    expect(rules("<Button iconStart={<X />} />")).toContain("icon-only-label");
    expect(rules('<Button aria-label="Close" iconStart={<X />} />')).not.toContain("icon-only-label");
  });

  it("flags clickable divs, raw colours, hand-picked radii and replaceable imports", () => {
    expect(rules("<div onClick={go}>Go</div>")).toContain("clickable-non-control");
    expect(rules("color: #ff0000;")).toContain("raw-colour");
    expect(rules("color: var(--kernel-color-text, #000);")).not.toContain("raw-colour");
    expect(rules("border-radius: 9999px;")).toContain("radius");
    expect(rules('import { Button } from "@/components/ui/button";')).toContain("replaceable-import");
  });

  it("accepts correct Kernel code", () => {
    expect(
      checkCode('<Button variant="primary" onClick={() => go(a > b)} data-x="1" aria-busy>Save</Button>'),
    ).toEqual([]);
  });
});

describe("kernel mcp init", () => {
  it("merges into an existing .mcp.json without dropping other servers", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "kernel-mcp-"));
    writeFileSync(path.join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { other: { command: "x" } } }));
    await runMcp({ cwd: dir, dryRun: false, yes: true }, ["init", "--client", "claude"]);
    const config = JSON.parse(readFileSync(path.join(dir, ".mcp.json"), "utf8"));
    expect(config.mcpServers.other).toEqual({ command: "x" });
    expect(config.mcpServers.kernel.args).toEqual(["-y", "@kernelui-lib/cli", "mcp"]);
  });

  it("writes VS Code's servers shape", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "kernel-mcp-"));
    await runMcp({ cwd: dir, dryRun: false, yes: true }, ["init", "--client=vscode"]);
    const config = JSON.parse(readFileSync(path.join(dir, ".vscode/mcp.json"), "utf8"));
    expect(config.servers.kernel.type).toBe("stdio");
  });
});

describe("kernel mcp init --client codex", () => {
  it("writes a [mcp_servers.kernel] table to .codex/config.toml", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "kernel-mcp-"));
    await runMcp({ cwd: dir, dryRun: false, yes: true }, ["init", "--client", "codex"]);
    const toml = readFileSync(path.join(dir, ".codex/config.toml"), "utf8");
    expect(toml).toContain("[mcp_servers.kernel]");
    expect(toml).toContain('args = ["-y", "@kernelui-lib/cli", "mcp"]');
  });

  it("replaces only its own table and keeps other config", () => {
    const before = [
      'model = "gpt-5"',
      "",
      "[mcp_servers.kernel]",
      'command = "old"',
      "",
      "[mcp_servers.kernel.env]",
      'X = "1"',
      "",
      "[mcp_servers.other]",
      'command = "x"',
      "",
    ].join("\n");
    const after = mergeCodexToml(before);
    expect(after).toContain('model = "gpt-5"');
    expect(after).toContain("[mcp_servers.other]");
    expect(after).not.toContain('command = "old"');
    expect(after).not.toContain("[mcp_servers.kernel.env]");
    expect(after.match(/\[mcp_servers\.kernel\]/g)).toHaveLength(1);
    expect(mergeCodexToml(after)).toBe(after);
  });
});
