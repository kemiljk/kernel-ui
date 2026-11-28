/**
 * Bundle-size budget for every publishable package.
 *
 * Measures the gzip and brotli size of what each package actually ships (its
 * `exports` entry files and built CSS, per `scripts/size-budgets.json`) and
 * fails when any entry is over its budget. Budgets sit ~10% above the size
 * measured when they were set, so ordinary component work fits but an
 * accidental dependency inline, a duplicated stylesheet, or a source map
 * leaking into the bundle doesn't slip through unnoticed.
 *
 * Run after a build — `dist/` has to exist. A missing file is a failure, not a
 * skip, so a renamed entry can't quietly drop out of the budget.
 *
 * Usage:
 *   node scripts/check-size.mjs            check against budgets
 *   node scripts/check-size.mjs --update   rewrite budgets to measured + 10%
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve, sep } from "node:path";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const budgetPath = join(root, "scripts/size-budgets.json");
const HEADROOM = 1.1;
const update = process.argv.includes("--update");

const config = JSON.parse(readFileSync(budgetPath, "utf8"));

/** `*` matches within one path segment, `**\/` matches any number of them. */
function globToRegExp(glob) {
  let pattern = "";
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === "*" && glob[i + 1] === "*" && glob[i + 2] === "/") {
      pattern += "(?:.*/)?";
      i += 2;
    } else if (char === "*") {
      pattern += "[^/]*";
    } else {
      pattern += char.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${pattern}$`);
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function resolveFiles(packageDir, globs) {
  const all = walk(packageDir)
    .map((file) => relative(packageDir, file).split(sep).join("/"))
    .filter((file) => !file.startsWith("node_modules/"));
  const matched = new Set();
  for (const glob of globs) {
    const regex = globToRegExp(glob);
    for (const file of all) if (regex.test(file)) matched.add(file);
  }
  return [...matched].sort();
}

function measure(buffer) {
  return {
    raw: buffer.length,
    gzip: gzipSync(buffer, { level: 9 }).length,
    brotli: brotliCompressSync(buffer, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  };
}

const kb = (bytes) => `${(bytes / 1000).toFixed(2)} kB`;
const budgetFor = (measured) => Math.ceil((measured * HEADROOM) / 100) * 100;

const rows = [];
const failures = [];

for (const pkg of config.packages) {
  const packageDir = join(root, pkg.dir);
  for (const entry of pkg.entries) {
    const files = resolveFiles(packageDir, entry.files);
    if (files.length === 0) {
      failures.push(
        `${pkg.name} › ${entry.label}: no files match ${entry.files.join(", ")} ` +
          `in ${pkg.dir} (run the build first, or update size-budgets.json).`,
      );
      continue;
    }
    const total = { raw: 0, gzip: 0, brotli: 0 };
    for (const file of files) {
      const size = measure(readFileSync(join(packageDir, file)));
      total.raw += size.raw;
      total.gzip += size.gzip;
      total.brotli += size.brotli;
    }

    if (update) {
      entry.budget = { gzip: budgetFor(total.gzip), brotli: budgetFor(total.brotli) };
    }

    const budget = entry.budget;
    let status = "ok";
    if (!budget) {
      status = "NO BUDGET";
      failures.push(`${pkg.name} › ${entry.label}: has no budget (run with --update).`);
    } else {
      for (const kind of ["gzip", "brotli"]) {
        if (total[kind] > budget[kind]) {
          status = "OVER";
          failures.push(
            `${pkg.name} › ${entry.label}: ${kind} ${kb(total[kind])} is over its ` +
              `${kb(budget[kind])} budget by ${kb(total[kind] - budget[kind])}.`,
          );
        }
      }
    }

    rows.push([
      pkg.name.replace("@kernelui-lib/", ""),
      entry.label,
      String(files.length),
      kb(total.raw),
      budget ? `${kb(total.gzip)} / ${kb(budget.gzip)}` : kb(total.gzip),
      budget ? `${kb(total.brotli)} / ${kb(budget.brotli)}` : kb(total.brotli),
      status,
    ]);
  }
}

const header = ["package", "entry", "files", "raw", "gzip / budget", "brotli / budget", ""];
const widths = header.map((_, column) =>
  Math.max(header[column].length, ...rows.map((row) => row[column].length)),
);
const line = (cells) => cells.map((cell, i) => cell.padEnd(widths[i])).join("  ").trimEnd();
console.log(line(header));
console.log(widths.map((width) => "-".repeat(width)).join("  "));
for (const row of rows) console.log(line(row));

if (update) {
  writeFileSync(budgetPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`\n[check-size] budgets rewritten to measured + ${Math.round((HEADROOM - 1) * 100)}%`);
  process.exit(failures.some((f) => f.includes("no files match")) ? 1 : 0);
}

if (failures.length > 0) {
  console.error("\n[check-size] failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    "\nIf the growth is intended, run `node scripts/check-size.mjs --update` " +
      "and say why in the PR.",
  );
  process.exit(1);
}

console.log("\n[check-size] ok");
