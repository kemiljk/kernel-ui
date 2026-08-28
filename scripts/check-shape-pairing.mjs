/**
 * Lints the two CSS conventions that are invisible until a user changes
 * something, and were both violated within a day of being written down:
 *
 *   1. A rule that adopts `--kernel-radius-container` / `-sheet` must pair it
 *      with `--kernel-padding-container-curve` / `-sheet-curve`. Those radii
 *      are derived FROM the padding tokens, so the radius grows with a
 *      consumer's `--kernel-radius-base` while a hand-picked `--kernel-space-3`
 *      stays flat: it looks fine at the default and reads as text crammed into
 *      a giant curve at Round. The padding may live on an inner part (a header
 *      bar, a row's outer cells), so the pairing is checked per component file,
 *      not per rule.
 *
 *   2. Anything with `cursor: pointer` must also set `user-select: none`.
 *      Otherwise a double-click on a disclosure selects its own label and a
 *      drag from a control selects text across the page. Any rule that sets
 *      `user-select: none` (or `text`) must also set `-webkit-user-select` to
 *      the same value — Safari still needs the prefix to actually suppress
 *      selection on a double-tap.
 *
 * Native form controls are exempt from the cursor:pointer half of (2):
 * there's no text in an `<input>` to select. Anything else can opt out
 * with an inline marker naming a reason:
 *
 *   /* shape-pairing-ok: reason *\/
 *
 * Usage: node scripts/check-shape-pairing.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCES = [
  { dir: "packages/react/src/components", suffix: ".module.css" },
  { dir: "packages/elements/src/components", suffix: ".css" },
];

const OPT_OUT = /shape-pairing-ok:/;

/** Strips comments so a rule mentioning a token in prose doesn't count as
 * declaring it. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Flat list of `{ selector, body }` for every rule, including rules nested in
 * at-rules — a `@media` block's contents are still rules that have to comply. */
function rules(css) {
  const found = [];
  const source = stripComments(css);
  let index = 0;

  while (index < source.length) {
    const open = source.indexOf("{", index);
    if (open === -1) break;
    const selector = source.slice(index, open).trim().split("\n").pop().trim();

    let depth = 1;
    let cursor = open + 1;
    while (cursor < source.length && depth > 0) {
      if (source[cursor] === "{") depth += 1;
      else if (source[cursor] === "}") depth -= 1;
      cursor += 1;
    }
    const body = source.slice(open + 1, cursor - 1);

    if (selector.startsWith("@")) {
      // At-rule: recurse, don't treat its contents as one rule's declarations.
      found.push(...rules(body));
    } else {
      found.push({ selector, body });
    }
    index = cursor;
  }

  return found;
}

/** A `<input>`/`<select>`-shaped rule: no text of its own to select. */
function isNativeControl(selector, body) {
  return (
    /input|select|::-webkit-|::file-selector-button/.test(selector) ||
    /appearance:\s*none/.test(body)
  );
}

const failures = [];

for (const { dir, suffix } of SOURCES) {
  const base = join(root, dir);
  for (const component of readdirSync(base, { withFileTypes: true })) {
    if (!component.isDirectory()) continue;
    for (const file of readdirSync(join(base, component.name))) {
      if (!file.endsWith(suffix)) continue;
      const relative = join(dir, component.name, file);
      const css = readFileSync(join(base, component.name, file), "utf8");
      const declared = stripComments(css);
      const optedOut = OPT_OUT.test(css);

      for (const [radius, padding] of [
        ["--kernel-radius-container", "--kernel-padding-container"],
        ["--kernel-radius-sheet", "--kernel-padding-sheet"],
      ]) {
        if (!declared.includes(`border-radius: var(${radius})`)) continue;
        // `-curve` is the preferred half of the pairing and contains the flat
        // token's name, so this accepts either. What it rejects is a
        // hand-picked --kernel-space-* sitting next to a derived radius, which
        // is the drift that only shows up once a consumer raises
        // --kernel-radius-base.
        if (declared.includes(padding)) continue;
        if (optedOut) continue;
        failures.push(
          `${relative}: adopts ${radius} but never pads with ${padding}-curve ` +
            `(or ${padding}). Pair them (see AGENTS.md, "Shape baseline"), or ` +
            `add /* shape-pairing-ok: why */.`,
        );
      }

      for (const { selector, body } of rules(css)) {
        const userSelect = body.match(/user-select:\s*(none|text)/);
        if (userSelect && !new RegExp(`-webkit-user-select:\\s*${userSelect[1]}`).test(body)) {
          failures.push(
            `${relative}: \`${selector}\` sets user-select: ${userSelect[1]} ` +
              `without -webkit-user-select (see AGENTS.md).`,
          );
        }
        if (!/cursor:\s*pointer/.test(body)) continue;
        if (/user-select:\s*none/.test(body)) continue;
        if (isNativeControl(selector, body)) continue;
        if (optedOut) continue;
        failures.push(
          `${relative}: \`${selector}\` is clickable but doesn't set ` +
            `user-select: none (see AGENTS.md).`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error("[check-shape-pairing] failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("[check-shape-pairing] ok");
