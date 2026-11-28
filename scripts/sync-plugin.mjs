#!/usr/bin/env node
// Keeps the Claude Code plugin in plugins/kernel-ui/ in step with the skills
// that ship in the npm packages.
//
// The plugin format only loads files inside the plugin directory (a skills
// path that escapes it fails validation), and an installed plugin is a copy
// in Claude Code's cache, so neither a symlink nor a "../" path can point back
// at packages/*/skills. The SKILL.md files under packages/ stay the only place
// anyone edits; this script copies them into the plugin and stamps the plugin
// version from @kernelui-lib/react, which ships the same skills, so plugin
// users get skill changes when a release goes out.
//
//   node scripts/sync-plugin.mjs          write the copy
//   node scripts/sync-plugin.mjs --check  exit 1 if the copy is stale (CI)
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginDir = path.join(root, "plugins", "kernel-ui");
const pluginSkillsDir = path.join(pluginDir, "skills");
const manifestPath = path.join(pluginDir, ".claude-plugin", "plugin.json");
const marketplacePath = path.join(root, ".claude-plugin", "marketplace.json");
const skillSources = [
  path.join(root, "packages", "react", "skills"),
  path.join(root, "packages", "elements", "skills"),
];
const check = process.argv.includes("--check");

function listFiles(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    if (name === ".DS_Store") continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full, base));
    else out.push(path.relative(base, full));
  }
  return out;
}

// Expected contents of plugins/kernel-ui/skills, keyed by path relative to it.
const expected = new Map();
for (const source of skillSources) {
  for (const skill of readdirSync(source).sort()) {
    const skillDir = path.join(source, skill);
    if (!statSync(skillDir).isDirectory()) continue;
    if (expected.has(path.join(skill, "SKILL.md"))) throw new Error(`Duplicate skill name: ${skill}`);
    for (const file of listFiles(skillDir)) {
      expected.set(path.join(skill, file), readFileSync(path.join(skillDir, file), "utf8"));
    }
  }
}

const reactVersion = JSON.parse(readFileSync(path.join(root, "packages", "react", "package.json"), "utf8")).version;
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));

const problems = [];
const actual = existsSync(pluginSkillsDir) ? listFiles(pluginSkillsDir) : [];
for (const file of actual) {
  if (!expected.has(file)) problems.push(`stale file: plugins/kernel-ui/skills/${file}`);
}
for (const [file, contents] of expected) {
  const target = path.join(pluginSkillsDir, file);
  if (!existsSync(target)) problems.push(`missing: plugins/kernel-ui/skills/${file}`);
  else if (readFileSync(target, "utf8") !== contents) problems.push(`out of date: plugins/kernel-ui/skills/${file}`);
}
if (manifest.version !== reactVersion) {
  problems.push(`plugin.json version ${manifest.version} does not match @kernelui-lib/react ${reactVersion}`);
}
if (!marketplace.plugins.some((entry) => entry.name === manifest.name)) {
  problems.push(`.claude-plugin/marketplace.json has no entry named ${manifest.name}`);
}

if (check) {
  if (problems.length) {
    console.error("[sync-plugin] plugins/kernel-ui is out of sync with packages/*/skills:");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error("[sync-plugin] run `bun run plugin:sync` and commit the result");
    process.exit(1);
  }
  console.log(`[sync-plugin] plugin in sync (${expected.size} skill files, version ${reactVersion})`);
  process.exit(0);
}

rmSync(pluginSkillsDir, { recursive: true, force: true });
for (const [file, contents] of expected) {
  const target = path.join(pluginSkillsDir, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, contents);
}
if (manifest.version !== reactVersion) {
  manifest.version = reactVersion;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(`[sync-plugin] copied ${expected.size} skill files into plugins/kernel-ui/skills (version ${reactVersion})`);
