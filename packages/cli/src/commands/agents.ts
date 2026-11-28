import { cpSync, existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { info, log, success } from "../lib/output.js";
import type { GlobalOptions } from "../lib/types.js";
import { initMcp } from "./mcp.js";

const START = "<!-- kernel-ui:start -->";
const END = "<!-- kernel-ui:end -->";

const AGENTS_BLOCK = `${START}
## Kernel UI

This project builds its UI with Kernel UI (\`@kernelui-lib/*\`), components on real semantic HTML.

- Pick a Kernel component before writing markup, and check its exact props before using it. Use the \`kernel\` MCP server (\`search_components\`, \`get_component\`) or \`npx @kernelui-lib/cli docs <name> --markdown\`. Props from other libraries (\`asChild\`, \`leftIcon\`) don't exist.
- Style only with \`--kernel-*\` tokens (MCP \`get_tokens\`), never raw colours, pixel radii or \`999px\`.
- Every form field needs \`label\` (use \`hideLabel\` to hide it visually). Every icon-only button needs \`aria-label\`.
- After writing UI, run \`npx @kernelui-lib/cli check <files>\` (or MCP \`check_code\`) and fix what it reports.
- Skills with the full guidance: \`kernel-ui\`, \`kernel-ui-theming\`, \`kernel-ui-migrate\`, \`kernel-ui-elements\`.
${END}`;

/** Skill folders from the project's installed packages, else the CLI's bundled copy. */
function skillSources(cwd: string) {
  const sources: string[] = [];
  for (const pkg of ["react", "elements"]) {
    const installed = path.join(cwd, "node_modules", "@kernelui-lib", pkg, "skills");
    const bundled = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "skills", pkg);
    const dir = existsSync(installed) ? installed : bundled;
    if (!existsSync(dir)) continue;
    // Only install the elements skill when the project uses elements (and vice
    // versa), unless neither is installed yet, in which case install both.
    const hasReact = existsSync(path.join(cwd, "node_modules", "@kernelui-lib", "react"));
    const hasElements = existsSync(path.join(cwd, "node_modules", "@kernelui-lib", "elements"));
    if ((hasReact || hasElements) && !(pkg === "react" ? hasReact : hasElements)) continue;
    for (const name of readdirSync(dir)) sources.push(path.join(dir, name));
  }
  return sources;
}

async function writeBlock(file: string, dryRun: boolean) {
  const existing = existsSync(file) ? await readFile(file, "utf8") : "";
  const start = existing.indexOf(START);
  const end = existing.indexOf(END);
  const next =
    start !== -1 && end > start
      ? existing.slice(0, start) + AGENTS_BLOCK + existing.slice(end + END.length)
      : `${existing.trimEnd()}${existing ? "\n\n" : ""}${AGENTS_BLOCK}\n`;
  if (dryRun) {
    info(`Would ${existing ? "update" : "create"} ${path.basename(file)}`);
    return;
  }
  await writeFile(file, next, "utf8");
  success(`${existing ? "Updated" : "Created"} ${path.basename(file)} with a Kernel UI section`);
}

/**
 * `kernel agents`: make a project agent-ready in one step.
 *   - skills into .claude/skills (or --dir)
 *   - the MCP server into the client's config (--client, or --no-mcp)
 *   - a short Kernel section in AGENTS.md, and CLAUDE.md if one exists
 */
export async function runAgents(global: GlobalOptions, rest: string[]) {
  const dirFlag = rest.find((arg) => arg.startsWith("--dir"));
  const dir = dirFlag?.includes("=") ? dirFlag.split("=")[1]! : dirFlag ? rest[rest.indexOf(dirFlag) + 1]! : ".claude/skills";

  if (!rest.includes("--no-skills")) {
    const sources = skillSources(global.cwd);
    for (const source of sources) {
      const target = path.join(global.cwd, dir, path.basename(source));
      if (global.dryRun) {
        info(`Would install skill ${path.basename(source)} → ${path.relative(global.cwd, target)}`);
        continue;
      }
      await mkdir(path.dirname(target), { recursive: true });
      cpSync(source, target, { recursive: true });
    }
    if (!global.dryRun) success(`Installed ${sources.length} skills into ${dir}`);
  }

  if (!rest.includes("--no-mcp")) await initMcp(global, rest);

  if (!rest.includes("--no-agents-md")) {
    await writeBlock(path.join(global.cwd, "AGENTS.md"), global.dryRun);
    const claude = path.join(global.cwd, "CLAUDE.md");
    if (existsSync(claude)) await writeBlock(claude, global.dryRun);
  }

  log("");
  info("Restart your agent session to load the skills and MCP server.");
}
