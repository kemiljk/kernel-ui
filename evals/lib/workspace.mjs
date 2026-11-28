import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { run } from "./util.mjs";

const evalsDir = new URL("..", import.meta.url).pathname;
const templateDir = join(evalsDir, "template");
const elementsOverlay = join(evalsDir, "template-elements");
const tasksDir = join(evalsDir, "tasks");

/**
 * Links every installed package of the template into `dir/node_modules`
 * one entry at a time (absolute symlinks to the real paths), so the copy
 * resolves the same workspace builds without sharing the template's
 * node_modules folder itself: if an agent installs something, it lands in
 * the copy, not in the template.
 */
function linkNodeModules(dir) {
  const source = join(templateDir, "node_modules");
  if (!existsSync(join(source, "@kernelui-lib", "react"))) {
    throw new Error("evals/template/node_modules is missing. Run `bun install` at the repo root first.");
  }
  const target = join(dir, "node_modules");
  mkdirSync(target, { recursive: true });
  for (const name of readdirSync(source)) {
    if (name === ".cache" || name === ".vite") continue;
    const from = join(source, name);
    if (name.startsWith("@") || name === ".bin") {
      mkdirSync(join(target, name), { recursive: true });
      for (const child of readdirSync(from)) symlinkSync(realpathSync(join(from, child)), join(target, name, child));
    } else {
      symlinkSync(realpathSync(from), join(target, name));
    }
  }
}

/** Points the generated MCP config at the workspace CLI build instead of `npx` (which would fetch the published one). */
function useLocalMcp(dir) {
  const cli = join(dir, "node_modules", "@kernelui-lib", "cli", "dist", "index.js");
  const mcpJson = join(dir, ".mcp.json");
  if (existsSync(mcpJson)) {
    const config = JSON.parse(readFileSync(mcpJson, "utf8"));
    for (const key of ["mcpServers", "servers"]) {
      if (config[key]?.kernel) config[key].kernel = { ...config[key].kernel, command: "node", args: [cli, "mcp"] };
    }
    writeFileSync(mcpJson, `${JSON.stringify(config, null, 2)}\n`);
  }
  const codexToml = join(dir, ".codex", "config.toml");
  if (existsSync(codexToml)) {
    const toml = readFileSync(codexToml, "utf8")
      .replace(/command = "npx"/, 'command = "node"')
      .replace(/args = \["-y", "@kernelui-lib\/cli", "mcp"\]/, `args = [${JSON.stringify(cli)}, "mcp"]`);
    writeFileSync(codexToml, toml);
  }
}

/**
 * Creates the task's project: the template (plus the elements overlay for
 * elements tasks), any starter files, linked node_modules, a git repo with
 * one commit (so the agent's changes are diffable), and, with
 * setup "full", what `kernel agents` installs: skills, the MCP server and
 * the AGENTS.md section, all from this checkout.
 */
export async function prepareProject(task, { workRoot, setup, client }) {
  const dir = join(workRoot, task.id);
  rmSync(dir, { recursive: true, force: true });
  cpSync(templateDir, dir, {
    recursive: true,
    filter: (src) => !/[/\\](node_modules|dist)([/\\]|$)/.test(src.slice(templateDir.length)),
  });
  const pkgPath = join(dir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.name = `kernel-eval-${task.id}`;
  delete pkg.description;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  if (task.package === "elements") {
    rmSync(join(dir, "src", "main.tsx"));
    rmSync(join(dir, "src", "App.tsx"));
    cpSync(elementsOverlay, dir, { recursive: true, filter: (src) => !src.endsWith("README.md") });
  }
  for (const [file, from] of Object.entries(task.files ?? {})) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    cpSync(join(tasksDir, from), join(dir, file));
  }
  writeFileSync(join(dir, ".gitignore"), "node_modules\ndist\n");
  linkNodeModules(dir);

  if (setup === "full") {
    const cli = join(dir, "node_modules", "@kernelui-lib", "cli", "dist", "index.js");
    const result = await run("node", [cli, "agents", "--client", client, "--path", dir], { cwd: dir });
    if (result.code !== 0) throw new Error(`kernel agents failed:\n${result.stdout}\n${result.stderr}`);
    useLocalMcp(dir);
  }

  const git = (...args) => run("git", ["-c", "user.name=kernel-evals", "-c", "user.email=evals@localhost", ...args], { cwd: dir });
  await git("init", "-q");
  await git("add", "-A");
  await git("commit", "-q", "-m", "Template");
  return dir;
}

/** Copies a reference solution's files over the project (used instead of an agent). */
export function applyReference(task, dir) {
  const source = join(evalsDir, "reference", task.id);
  if (!existsSync(source)) throw new Error(`No reference solution at evals/reference/${task.id}`);
  cpSync(source, dir, { recursive: true });
}

export const hasReference = (task) => existsSync(join(evalsDir, "reference", task.id));

export function loadTasks(filter) {
  const tasks = readdirSync(tasksDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(tasksDir, f), "utf8")));
  if (!filter?.length) return tasks;
  const unknown = filter.filter((id) => !tasks.some((t) => t.id === id));
  if (unknown.length) throw new Error(`Unknown task(s): ${unknown.join(", ")}. Known: ${tasks.map((t) => t.id).join(", ")}`);
  return tasks.filter((t) => filter.includes(t.id));
}
