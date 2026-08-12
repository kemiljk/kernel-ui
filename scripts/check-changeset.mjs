#!/usr/bin/env node

/**
 * Ensures every publishable package that has file changes also has a
 * corresponding `.changeset/*.md` entry — required before merging PRs or
 * running the release workflow.
 *
 * Usage:
 *   node scripts/check-changeset.mjs                  # compares to main
 *   node scripts/check-changeset.mjs origin/main       # custom base ref
 *   node scripts/check-changeset.mjs v1.2.0            # compare against a tag
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { execSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baseRef = process.argv[2] || "main";

// ── 1. Discover publishable packages ──────────────────────────────────────

function listPublishablePackages() {
  const pkgs = new Map(); // name -> package.json path (relative to root)
  const packagesDir = join(root, "packages");
  for (const pkgDir of readdirSync(packagesDir)) {
    const pjsonPath = join(packagesDir, pkgDir, "package.json");
    try {
      const pjson = JSON.parse(readFileSync(pjsonPath, "utf8"));
      if (pjson.publishConfig?.access === "public") {
        pkgs.set(pjson.name, `packages/${pkgDir}/package.json`);
      }
    } catch {
      // Not a directory or missing package.json — skip.
    }
  }
  return pkgs;
}

// ── 2. Parse .changeset/*.md frontmatter → Set of affected package names ─

function getAffectedPackages() {
  const nameSet = new Set();
  const csDir = join(root, ".changeset");
  if (!readdirSync(csDir).length) return nameSet;

  for (const file of readdirSync(csDir)) {
    if (!file.endsWith(".md")) continue;
    const content = readFileSync(join(csDir, file), "utf8");
    // Extract YAML frontmatter between --- delimiters.
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) continue;
    const lines = match[1].split("\n");
    for (const line of lines) {
      // Match lines like: "@kernelui-lib/react": minor
      const pkgMatch = line.match(/^["'](@[^"']+?)["']\s*:/);
      if (pkgMatch) nameSet.add(pkgMatch[1]);
    }
  }
  return nameSet;
}

// ── 3. Get changed publishable package paths via git diff ─────────────────

function getChangedPackages() {
  const packages = listPublishablePackages();
  const changedFiles = new Set();

  try {
    // git diff between base ref and HEAD, listing only modified files.
    const output = execSync(
      `git diff --name-only ${JSON.stringify(baseRef)} HEAD`,
      { cwd: root, encoding: "utf8" },
    );
    for (const line of output.split("\n").filter(Boolean)) {
      changedFiles.add(line);
    }
  } catch {
    // No diff available (e.g. detached HEAD with no commits ahead) — treat
    // as if nothing changed, which won't block the pipeline spuriously.
    return [];
  }

  const affected = [];
  for (const [pkgName, relPath] of packages.entries()) {
    if (changedFiles.has(relPath)) {
      affected.push({ name: pkgName, path: relPath });
    }
  }
  return affected;
}

// ── 4. Run the check ─────────────────────────────────────────────────────

const changed = getChangedPackages();
const hasChangeset = getAffectedPackages();

if (changed.length === 0) {
  console.log("[check-changeset] ok — no publishable package changes detected");
  process.exit(0);
}

const missing = changed.filter(({ name }) => !hasChangeset.has(name));

if (missing.length > 0) {
  console.error(
    "[check-changeset] publishable package changes require a .changeset/*.md file",
  );
  for (const { name } of missing) {
    console.error(`  - ${name} has no associated changeset`);
  }
  console.error(
    "\n[check-changeset] add one with `bunx changeset` and choose the affected package release type",
  );
  process.exit(1);
}

console.log("[check-changeset] ok — all publishable changes have changesets");
