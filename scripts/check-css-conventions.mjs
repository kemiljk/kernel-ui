/**
 * Lints three CSS mistakes that look fine in the default demo and only show
 * up for someone else: a right-to-left reader, a dark theme, or a consumer
 * who retunes the motion tokens. Sits beside check-shape-pairing.mjs and
 * scans the same component CSS in both packages.
 *
 *   physical-direction  A horizontal translate, a `linear-gradient(to left|
 *                       right …)`, or a physical property (`left`, `right`,
 *                       `margin-left`, `padding-right`, `border-left…`,
 *                       `text-align: left`, `float: right`…) in a rule that
 *                       has no RTL counterpart. Logical properties need no
 *                       counterpart, so prefer them. When a value really has
 *                       to flip, the counterpart must carry BOTH selector
 *                       forms — `.x:dir(rtl), :where([dir="rtl"]) .x` —
 *                       because the build rewrites `:dir()` into a `:lang()`
 *                       list that misses pages setting only `dir="rtl"` (see
 *                       AGENTS.md's `:dir(rtl)` gotcha). An RTL rule with
 *                       only one of the two forms fails too. Not flagged:
 *                       vertical translates, `-50%` centring, opaque
 *                       `var()` values, and physical pairs that are
 *                       symmetric (`left` and `right` set to the same value).
 *
 *   black-hover         A black-alpha colour (`rgba(0,0,0,…)`,
 *                       `rgb(0 0 0 / …)`, `#0000001a`, `oklch(0 0 0 / …)`,
 *                       `color-mix(… black …)`) in a `:hover`/`:active` rule.
 *                       Black disappears on a dark surface; the token is
 *                       `--kernel-color-overlay-hover`, which mixes from
 *                       `currentColor` and so works in both schemes.
 *
 *   literal-motion      A literal duration (`150ms`, `0.2s`) or easing
 *                       (`ease-in-out`, `linear`, `cubic-bezier(…)`,
 *                       `steps(…)`) in a `transition*`/`animation*`
 *                       declaration instead of a `--kernel-duration-*` /
 *                       `--kernel-ease-*` token. Zero durations (`0s`,
 *                       `0ms`) are "no motion", not a timing choice, and are
 *                       always allowed. Inside a `prefers-reduced-motion`
 *                       block, `linear` and near-zero durations (≤ 0.01ms)
 *                       are allowed too: that block's job is a plain
 *                       crossfade, and no easing token is meant for it.
 *
 * A genuine exception is allowlisted inline, naming the check and a reason:
 *
 *   /* kernel-allow: literal-motion — scroll-driven, so there is no time *\/
 *
 * The marker covers the rule it sits inside or directly above. Placed in (or
 * directly above) an at-rule such as `@keyframes`, it covers every rule
 * nested in it. Several checks can be named, comma-separated.
 *
 * Usage: node scripts/check-css-conventions.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCES = [
  { dir: "packages/react/src/components", suffix: ".module.css" },
  { dir: "packages/elements/src/components", suffix: ".css" },
];

const CHECKS = ["physical-direction", "black-hover", "literal-motion"];
const MARKER = /kernel-allow:\s*([a-z-]+(?:\s*,\s*[a-z-]+)*)\s*(?:—|–|-|:)\s*\S/g;

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Replaces each comment with spaces of the same length (newlines kept), so
 * indices and line numbers in the blanked text still match the source. */
function blankComments(css) {
  const comments = [];
  const blank = css.replace(/\/\*[\s\S]*?\*\//g, (match, offset) => {
    comments.push({ start: offset, end: offset + match.length, text: match });
    return match.replace(/[^\n]/g, " ");
  });
  return { blank, comments };
}

function allowancesIn(comments, from, to, excluded = []) {
  const found = new Set();
  for (const comment of comments) {
    if (comment.start < from || comment.end > to) continue;
    if (excluded.some(([start, end]) => comment.start >= start && comment.end <= end)) continue;
    for (const match of comment.text.matchAll(MARKER)) {
      for (const name of match[1].split(",")) found.add(name.trim());
    }
  }
  return found;
}

function matchingBrace(text, open) {
  let depth = 1;
  let cursor = open + 1;
  while (cursor < text.length && depth > 0) {
    if (text[cursor] === "{") depth += 1;
    else if (text[cursor] === "}") depth -= 1;
    cursor += 1;
  }
  return cursor - 1;
}

/** Top-level `{…}` ranges inside [from, to). */
function nestedBlocks(text, from, to) {
  const ranges = [];
  let cursor = from;
  while (cursor < to) {
    const open = text.indexOf("{", cursor);
    if (open === -1 || open >= to) break;
    const close = matchingBrace(text, open);
    ranges.push([open, close]);
    cursor = close + 1;
  }
  return ranges;
}

/** Flat list of rules with their selector, declarations, enclosing at-rules,
 * and the checks a `kernel-allow` marker switches off for them. */
function parse(css) {
  const { blank, comments } = blankComments(css);
  const lineAt = (index) => css.slice(0, index).split("\n").length;
  const rules = [];

  function walk(from, to, ancestors, inherited) {
    let segment = from;
    let cursor = from;
    while (cursor < to) {
      const char = blank[cursor];
      if (char === ";" || char === "}") {
        segment = cursor + 1;
      } else if (char === "{") {
        const close = matchingBrace(blank, cursor);
        const prelude = blank.slice(segment, cursor).replace(/\s+/g, " ").trim();
        const nested = nestedBlocks(blank, cursor + 1, close);
        const above = allowancesIn(comments, segment, cursor);
        // A rule's own body counts; an at-rule's body doesn't, or a marker
        // above its first nested rule would leak to every sibling.
        const inside = prelude.startsWith("@")
          ? []
          : allowancesIn(comments, cursor + 1, close, nested);
        const allow = new Set([...inherited, ...above, ...inside]);
        const preludeStart = segment + (blank.slice(segment, cursor).length -
          blank.slice(segment, cursor).trimStart().length);

        if (prelude.startsWith("@")) {
          walk(cursor + 1, close, [...ancestors, prelude], allow);
        } else {
          rules.push({
            selector: prelude,
            line: lineAt(preludeStart),
            declarations: declarations(blank, cursor + 1, close, lineAt),
            ancestors,
            allow,
          });
        }
        cursor = close;
        segment = close + 1;
      }
      cursor += 1;
    }
  }

  walk(0, blank.length, [], new Set());
  return rules;
}

function declarations(text, from, to, lineAt) {
  const found = [];
  let start = from;
  let depth = 0;
  for (let cursor = from; cursor <= to; cursor += 1) {
    const char = text[cursor];
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    if ((char === ";" && depth === 0) || cursor === to) {
      const raw = text.slice(start, cursor);
      const colon = raw.indexOf(":");
      if (colon !== -1) {
        const offset = raw.length - raw.trimStart().length;
        found.push({
          property: raw.slice(0, colon).trim().toLowerCase(),
          value: raw.slice(colon + 1).replace(/\s+/g, " ").replace(/\s*!important\s*$/, "").trim(),
          line: lineAt(start + offset),
        });
      }
      start = cursor + 1;
    }
  }
  return found;
}

/** Replaces every `var(…)` (balanced) with a placeholder, so a fallback or a
 * token name can't be mistaken for a literal. */
function stripVars(value) {
  let out = "";
  let cursor = 0;
  while (cursor < value.length) {
    const start = value.indexOf("var(", cursor);
    if (start === -1) {
      out += value.slice(cursor);
      break;
    }
    out += value.slice(cursor, start) + "VAR";
    let depth = 0;
    let end = start + 3;
    for (; end < value.length; end += 1) {
      if (value[end] === "(") depth += 1;
      else if (value[end] === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    cursor = end + 1;
  }
  return out;
}

/** Splits on top-level whitespace/commas, keeping `fn(a, b)` whole. */
function topLevelParts(value, separator = /[\s]/) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of value) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (depth === 0 && separator.test(char)) {
      if (current) parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current) parts.push(current);
  return parts;
}

// ---------------------------------------------------------------------------
// literal-motion
// ---------------------------------------------------------------------------

const MOTION_PROPERTY = /^(transition|animation)(-duration|-timing-function|-delay)?$/;
const DURATION = /(?<![\w.-])(\d*\.?\d+)(ms|s)(?![\w-])/g;
const EASING_KEYWORD = /(?<![\w-])(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end)(?![\w-])/g;
const EASING_FUNCTION = /(?<![\w-])(cubic-bezier|steps|linear)\(/g;

function literalMotion(rule) {
  const reduced = rule.ancestors.some((at) => /prefers-reduced-motion/.test(at));
  const problems = [];
  for (const { property, value, line } of rule.declarations) {
    if (!MOTION_PROPERTY.test(property)) continue;

    // One comma-separated item per transitioned property / animation.
    for (const item of topLevelParts(stripVars(value), /,/)) {
      const durations = [...item.matchAll(DURATION)].map(
        ([, number, unit]) => ({ text: `${number}${unit}`, ms: Number(number) * (unit === "s" ? 1000 : 1) }),
      );
      for (const { text, ms } of durations) {
        if (ms === 0) continue;
        if (reduced && ms <= 0.01) continue;
        problems.push({ line, message: `\`${property}\` uses literal duration ${text}; use a --kernel-duration-* token` });
      }
      // An item whose only duration is zero (`visibility 0s linear 120ms`,
      // the discrete-flip idiom) never plays a curve, so its easing is moot.
      if (durations.length > 0 && durations[0].ms === 0) continue;

      for (const [, fn] of item.matchAll(EASING_FUNCTION)) {
        problems.push({ line, message: `\`${property}\` uses literal ${fn}(); use a --kernel-ease-* token` });
      }
      const keywords = item.replace(EASING_FUNCTION, "FN(");
      for (const [, keyword] of keywords.matchAll(EASING_KEYWORD)) {
        if (reduced && keyword === "linear") continue;
        problems.push({ line, message: `\`${property}\` uses literal easing \`${keyword}\`; use a --kernel-ease-* token` });
      }
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// black-hover
// ---------------------------------------------------------------------------

const HOVER_SELECTOR = /:hover|:active/;
const COLOUR_PROPERTY = /^(background(-color|-image)?|color|border(-[a-z-]+)?|outline(-color)?|fill|stroke|text-decoration-color|--.*)$/;
const BLACK_ALPHA = [
  /rgba?\(\s*0\s*[, ]\s*0\s*[, ]\s*0\s*[,/]/,
  /#000[0-9a-f](?![0-9a-f])/i,
  /#000000[0-9a-f]{2}(?![0-9a-f])/i,
  /hsla?\(\s*0(deg)?\s*[, ]\s*0%\s*[, ]\s*0%\s*[,/]/,
  /oklch\(\s*0%?\s+0\s+0(deg)?\s*\//,
  /color-mix\([^)]*\bblack\b/,
];

function blackHover(rule) {
  if (!HOVER_SELECTOR.test(rule.selector)) return [];
  const problems = [];
  for (const { property, value, line } of rule.declarations) {
    if (!COLOUR_PROPERTY.test(property)) continue;
    if (!BLACK_ALPHA.some((pattern) => pattern.test(value))) continue;
    problems.push({
      line,
      message: `hover/active \`${property}\` uses a black-alpha colour; use --kernel-color-overlay-hover`,
    });
  }
  return problems;
}

// ---------------------------------------------------------------------------
// physical-direction
// ---------------------------------------------------------------------------

const RTL_DIR = /:dir\(\s*rtl\s*\)/g;
const RTL_ATTR = /(?::where\(\s*)?\[dir=["']?rtl["']?\](?:\s*\))?\s*/g;
const DIRECTIONAL_SELECTOR = /:dir\(|\[dir=/;

function selectorParts(selector) {
  return topLevelParts(selector, /,/).map((part) => part.trim()).filter(Boolean);
}

function baseSelector(part) {
  return part.replace(RTL_DIR, "").replace(RTL_ATTR, "").replace(/\s+/g, " ").trim();
}

/** base selector → which RTL forms target it in this file. */
function rtlCounterparts(rules) {
  const map = new Map();
  for (const rule of rules) {
    for (const part of selectorParts(rule.selector)) {
      const dir = /:dir\(\s*rtl\s*\)/.test(part);
      const attr = /\[dir=["']?rtl["']?\]/.test(part);
      if (!dir && !attr) continue;
      const base = baseSelector(part);
      const entry = map.get(base) ?? { dir: false, attr: false };
      entry.dir ||= dir;
      entry.attr ||= attr;
      map.set(base, entry);
    }
  }
  return map;
}

const PHYSICAL_PAIRS = [
  ["left", "right"],
  ["margin-left", "margin-right"],
  ["padding-left", "padding-right"],
  ["border-left", "border-right"],
  ["border-left-width", "border-right-width"],
  ["border-left-color", "border-right-color"],
  ["border-left-style", "border-right-style"],
  ["scroll-margin-left", "scroll-margin-right"],
  ["scroll-padding-left", "scroll-padding-right"],
  ["border-top-left-radius", "border-top-right-radius"],
  ["border-bottom-left-radius", "border-bottom-right-radius"],
];
const PHYSICAL_PROPERTIES = new Map(PHYSICAL_PAIRS.flatMap(([a, b]) => [[a, b], [b, a]]));
const PHYSICAL_KEYWORD_PROPERTY = /^(float|clear|text-align)$/;

const GRADIENT_TO_SIDE = /linear-gradient\(\s*to\s+(?:(?:top|bottom)\s+)?(left|right)\b/;
const NEUTRAL_X = /^(0|0px|0%|none|-50%|VAR)$/;

function horizontalTranslate(property, value) {
  const literal = stripVars(value).trim();
  if (property === "translate" || /^--.*translate/.test(property)) {
    const [x] = topLevelParts(literal);
    return x !== undefined && !NEUTRAL_X.test(x);
  }
  if (property === "transform") {
    for (const match of literal.matchAll(/translate(X|3d)?\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)) {
      const [x] = topLevelParts(match[2], /,/).map((part) => part.trim());
      if (x !== undefined && !NEUTRAL_X.test(x)) return true;
    }
  }
  return false;
}

function physicalDirection(rule, counterparts) {
  const problems = [];

  // An RTL rule itself must carry both forms.
  if (DIRECTIONAL_SELECTOR.test(rule.selector)) {
    for (const part of selectorParts(rule.selector)) {
      const base = baseSelector(part);
      if (base === part.trim()) continue;
      const entry = counterparts.get(base);
      if (entry && !(entry.dir && entry.attr)) {
        problems.push({
          line: rule.line,
          message:
            `\`${base}\` has an RTL rule with only ${entry.dir ? ":dir(rtl)" : '[dir="rtl"]'}; ` +
            `pair it as \`${base}:dir(rtl), :where([dir="rtl"]) ${base}\``,
        });
      }
    }
    return problems;
  }

  const values = new Map(rule.declarations.map(({ property, value }) => [property, value]));
  const centred = [...values].some(
    ([property, value]) =>
      (property === "translate" || property === "transform") && /-50%/.test(value),
  );
  const found = [];
  for (const { property, value, line } of rule.declarations) {
    if (PHYSICAL_PROPERTIES.has(property)) {
      const partner = PHYSICAL_PROPERTIES.get(property);
      if (values.get(partner) === value) continue; // symmetric
      if ((property === "left" || property === "right") && value === "50%" && centred) continue;
      if (value === "auto" && values.has(partner)) continue; // the partner is the real anchor
      found.push({ line, what: `\`${property}: ${value}\`` });
    } else if (PHYSICAL_KEYWORD_PROPERTY.test(property) && /^(left|right)$/.test(value)) {
      found.push({ line, what: `\`${property}: ${value}\`` });
    } else if (horizontalTranslate(property, value)) {
      found.push({ line, what: `horizontal \`${property}: ${value}\`` });
    } else if (GRADIENT_TO_SIDE.test(value)) {
      const side = value.match(GRADIENT_TO_SIDE)[1];
      found.push({ line, what: `\`linear-gradient(to ${side} …)\` in \`${property}\`` });
    }
  }
  if (found.length === 0) return problems;

  const paired = selectorParts(rule.selector).every((part) => {
    const entry = counterparts.get(baseSelector(part));
    return entry?.dir && entry?.attr;
  });
  if (paired) return problems;

  for (const { line, what } of found) {
    problems.push({
      line,
      message:
        `${what} has no RTL counterpart; use a logical property, or add ` +
        `\`<selector>:dir(rtl), :where([dir="rtl"]) <selector>\``,
    });
  }
  return problems;
}

// ---------------------------------------------------------------------------

const failures = [];
const unknownMarkers = [];

for (const { dir, suffix } of SOURCES) {
  const base = join(root, dir);
  for (const component of readdirSync(base, { withFileTypes: true })) {
    if (!component.isDirectory()) continue;
    for (const file of readdirSync(join(base, component.name))) {
      if (!file.endsWith(suffix)) continue;
      const relative = join(dir, component.name, file);
      const css = readFileSync(join(base, component.name, file), "utf8");
      const rules = parse(css);
      const counterparts = rtlCounterparts(rules);

      for (const match of css.matchAll(/kernel-allow:\s*([a-z-]+(?:\s*,\s*[a-z-]+)*)/g)) {
        for (const name of match[1].split(",").map((n) => n.trim())) {
          if (!CHECKS.includes(name)) unknownMarkers.push(`${relative}: unknown check "${name}" in kernel-allow`);
        }
      }

      for (const rule of rules) {
        const results = [
          ["physical-direction", physicalDirection(rule, counterparts)],
          ["black-hover", blackHover(rule)],
          ["literal-motion", literalMotion(rule)],
        ];
        for (const [check, problems] of results) {
          if (rule.allow.has(check)) continue;
          for (const { line, message } of problems) {
            failures.push(`${relative}:${line} [${check}] ${message}`);
          }
        }
      }
    }
  }
}

failures.push(...unknownMarkers);

if (failures.length > 0) {
  console.error("[check-css-conventions] failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    "\nFix it, or allowlist a genuine exception inside (or directly above) the rule:\n" +
      "  /* kernel-allow: <check> — reason */",
  );
  process.exit(1);
}

console.log("[check-css-conventions] ok");
