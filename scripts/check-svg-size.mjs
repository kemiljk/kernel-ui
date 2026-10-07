/**
 * Fails on any inline `<svg>` in either package that has no intrinsic
 * `width`/`height`.
 *
 * A `viewBox` alone gives an SVG an aspect ratio but no size, so with the
 * component stylesheet absent the browser falls back to the replaced-element
 * default of 300×150 — a Select chevron balloons to fill the form and pushes
 * everything after it off-screen. That breaks the promise that skipping
 * styles.css leaves every component "fully functional, just unstyled — never
 * broken". The attributes should equal the size the component CSS already
 * gives the icon, so styled rendering is unchanged (CSS beats presentation
 * attributes) and unstyled rendering is icon-sized.
 *
 * Checked forms:
 *   - JSX / template-string markup: every `<svg ...>` opening tag must carry
 *     both `width=` and `height=`.
 *   - `const x = document.createElementNS(SVG_NS, "svg")`: the same file must
 *     call `x.setAttribute("width", …)` and `x.setAttribute("height", …)`.
 *
 * Usage: node scripts/check-svg-size.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCES = [
  { dir: "packages/react/src", suffixes: [".tsx", ".ts"] },
  { dir: "packages/elements/src", suffixes: [".ts"] },
];

function walk(dir, suffixes) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path, suffixes));
    else if (suffixes.some((s) => entry.name.endsWith(s)) && !/\.test\.tsx?$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

const failures = [];

for (const { dir, suffixes } of SOURCES) {
  for (const file of walk(join(root, dir), suffixes)) {
    const source = readFileSync(file, "utf8");
    const rel = relative(root, file);

    // Opening tags, possibly spanning lines. `[^>]` is safe here: no
    // attribute value on an icon's opening tag contains `>`.
    for (const match of source.matchAll(/<svg\b[^>]*>/g)) {
      const tag = match[0];
      if (!/\swidth=/.test(tag) || !/\sheight=/.test(tag)) {
        failures.push(`${rel}:${lineOf(source, match.index)}  <svg> without width/height`);
      }
    }

    for (const match of source.matchAll(
      /(?:const|let)\s+(\w+)\s*=\s*document\.createElementNS\([^,]+,\s*"svg"\)/g,
    )) {
      const name = match[1];
      for (const attr of ["width", "height"]) {
        if (!new RegExp(`\\b${name}\\.setAttribute\\(\\s*"${attr}"`).test(source)) {
          failures.push(
            `${rel}:${lineOf(source, match.index)}  createElementNS svg "${name}" never sets ${attr}`,
          );
        }
      }
    }
  }
}

if (failures.length > 0) {
  console.error(
    `Inline SVGs need intrinsic width/height (they render 300×150 without component CSS):\n\n  ${failures.join("\n  ")}\n`,
  );
  process.exit(1);
}

console.log("check-svg-size: every inline <svg> has an intrinsic width/height.");
