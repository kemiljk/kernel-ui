import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runAgents } from "../dist/commands/agents.js";

const project = () => mkdtempSync(path.join(tmpdir(), "kernel-agents-"));
const opts = (cwd: string, dryRun = false) => ({ cwd, dryRun, yes: true });

describe("kernel agents", () => {
  it("installs every bundled skill, registers MCP and writes AGENTS.md in a fresh project", async () => {
    const dir = project();
    await runAgents(opts(dir), []);
    for (const skill of ["kernel-ui", "kernel-ui-theming", "kernel-ui-migrate", "kernel-ui-elements"]) {
      const file = path.join(dir, ".claude/skills", skill, "SKILL.md");
      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file, "utf8")).toMatch(new RegExp(`^---\\nname: ${skill}\\n`));
    }
    expect(JSON.parse(readFileSync(path.join(dir, ".mcp.json"), "utf8")).mcpServers.kernel).toBeDefined();
    expect(readFileSync(path.join(dir, "AGENTS.md"), "utf8")).toContain("## Kernel UI");
  });

  it("replaces its own AGENTS.md section on a second run instead of duplicating it", async () => {
    const dir = project();
    writeFileSync(path.join(dir, "AGENTS.md"), "# Project rules\n\nBe nice.\n");
    await runAgents(opts(dir), ["--no-mcp", "--no-skills"]);
    await runAgents(opts(dir), ["--no-mcp", "--no-skills"]);
    const text = readFileSync(path.join(dir, "AGENTS.md"), "utf8");
    expect(text.startsWith("# Project rules\n\nBe nice.")).toBe(true);
    expect(text.match(/kernel-ui:start/g)).toHaveLength(1);
  });

  it("also updates CLAUDE.md when the project has one", async () => {
    const dir = project();
    writeFileSync(path.join(dir, "CLAUDE.md"), "# Claude\n");
    await runAgents(opts(dir), ["--no-mcp", "--no-skills"]);
    expect(readFileSync(path.join(dir, "CLAUDE.md"), "utf8")).toContain("## Kernel UI");
  });

  it("installs only the React skills when only @kernelui-lib/react is installed", async () => {
    const dir = project();
    const pkgSkills = path.join(dir, "node_modules/@kernelui-lib/react/skills/kernel-ui");
    mkdirSync(pkgSkills, { recursive: true });
    writeFileSync(path.join(pkgSkills, "SKILL.md"), "---\nname: kernel-ui\ndescription: installed copy\n---\n");
    await runAgents(opts(dir), ["--no-mcp", "--no-agents-md"]);
    expect(readFileSync(path.join(dir, ".claude/skills/kernel-ui/SKILL.md"), "utf8")).toContain("installed copy");
    expect(existsSync(path.join(dir, ".claude/skills/kernel-ui-elements"))).toBe(false);
  });

  it("respects --dir and --dry-run", async () => {
    const dir = project();
    await runAgents(opts(dir, true), ["--dir", ".agents/skills"]);
    expect(existsSync(path.join(dir, ".agents"))).toBe(false);
    expect(existsSync(path.join(dir, "AGENTS.md"))).toBe(false);
    await runAgents(opts(dir), ["--dir=.agents/skills", "--no-mcp", "--no-agents-md"]);
    expect(existsSync(path.join(dir, ".agents/skills/kernel-ui/SKILL.md"))).toBe(true);
  });
});
