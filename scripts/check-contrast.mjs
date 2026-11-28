#!/usr/bin/env node
/**
 * Contrast check for Kernel's semantic colour tokens, in every accent preset
 * and both colour schemes, against the canvas and surface they sit on.
 *
 * Two measures, because they answer different questions:
 *
 *   - APCA (Accessible Perceptual Contrast Algorithm, APCA-W3 0.0.98G-4g),
 *     the method proposed for WCAG 3. It models perceived lightness contrast,
 *     so it's polarity-aware (light-on-dark is not the mirror of dark-on-light)
 *     and much better at catching dark-mode colours that WCAG 2's ratio
 *     overrates. Kernel designs to APCA.
 *   - WCAG 2.x contrast ratio, the standard most legal requirements cite
 *     today. Kernel keeps it as a floor.
 *
 * Targets (APCA levels from the APCA project's published use-case ranges):
 *   - body text: Lc 75 (minimum for body text) and 4.5:1
 *   - muted text: Lc 60 (minimum for content text that isn't body text) and 4.5:1
 *   - focus ring and control borders: Lc 45 and 3:1. These are 1–2px lines,
 *     which APCA counts as fine detail with a higher minimum than solid
 *     shapes; Lc 45 is its level for fine-detail pictograms and outline icons.
 *   - text on a solid fill (on-accent on accent, accent-hover and
 *     accent-active; on-danger, on-success and on-warning on their fills):
 *     Lc 60 and 4.5:1. These are button labels, Pagination's current page,
 *     a selected date, Toast and Callout glyphs: short, 14–16px, weight 500
 *     or more, read but not read at length. APCA's Lc 75 is for body and
 *     column text, and Lc 45 is for large text (about 24px bold and up);
 *     a button label is neither. Lc 60 is APCA's minimum for content text
 *     that isn't body text, the level muted text already uses. Hover and
 *     pressed fills are checked too, because the label is still being read
 *     while they show.
 *   - tinted text on its own subtle fill (Badge's accent, success, warning
 *     and danger variants): Lc 60 and 4.5:1, for the same reason.
 *
 * Browsers that support `contrast-color()` take the `@supports` branch in
 * tokens.css instead of the fixed fallback, so every pair is checked both
 * ways and the worse result is reported. A preset in themes/*.css that sets
 * its own on-colour overrides both branches.
 *
 * Lc is reported as an absolute value; APCA's sign only encodes polarity.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const tokens = readFileSync(join(root, "packages/styles/src/tokens.css"), "utf8");

const RULES = [
  { token: "--kernel-color-text", lc: 75, ratio: 4.5, use: "body text" },
  { token: "--kernel-color-text-muted", lc: 60, ratio: 4.5, use: "muted text" },
  { token: "--kernel-color-focus-ring", lc: 45, ratio: 3, use: "focus ring" },
  { token: "--kernel-color-border-control", lc: 45, ratio: 3, use: "control border" },
  // Combobox/CommandPalette's fuzzy-match underline: a 1px accent line under
  // matched characters, on the popup surface and on the active row's
  // accent-subtle fill. Held to the same fine-line target as a focus ring.
  {
    token: "--kernel-color-accent-text",
    lc: 45,
    ratio: 3,
    use: "match underline",
    backgrounds: ["--kernel-color-canvas", "--kernel-color-surface", "--kernel-color-accent-subtle"],
  },
];
const BACKGROUNDS = ["--kernel-color-canvas", "--kernel-color-surface"];

/** Text that sits on a solid or tinted fill rather than on the canvas. */
const PAIRS = [
  { fg: "--kernel-color-on-accent", bgs: ["--kernel-color-accent", "--kernel-color-accent-hover", "--kernel-color-accent-active"], lc: 60, ratio: 4.5, use: "on-accent" },
  { fg: "--kernel-color-on-danger", bgs: ["--kernel-color-danger", "--kernel-color-danger-hover"], lc: 60, ratio: 4.5, use: "on-danger" },
  { fg: "--kernel-color-on-success", bgs: ["--kernel-color-success"], lc: 60, ratio: 4.5, use: "on-success" },
  { fg: "--kernel-color-on-warning", bgs: ["--kernel-color-warning"], lc: 60, ratio: 4.5, use: "on-warning" },
  { fg: "--kernel-color-accent-text", bgs: ["--kernel-color-accent-subtle"], lc: 60, ratio: 4.5, use: "accent badge" },
  { fg: "--kernel-color-danger-text", bgs: ["--kernel-color-danger-subtle"], lc: 60, ratio: 4.5, use: "danger badge" },
  { fg: "--kernel-color-success-text", bgs: ["--kernel-color-success-subtle"], lc: 60, ratio: 4.5, use: "success badge" },
  { fg: "--kernel-color-warning-text", bgs: ["--kernel-color-warning-subtle"], lc: 60, ratio: 4.5, use: "warning badge" },
];

// ── Colour maths ───────────────────────────────────────────────────────────
function oklchToSrgb(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v)));
  return linear.map((v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
}

function wcagLuminance(rgb) {
  const [r, g, b] = rgb.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function wcagRatio(a, b) {
  const [x, y] = [wcagLuminance(a), wcagLuminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** APCA-W3 0.0.98G-4g Lc, text/foreground on background. */
function apca(fg, bg) {
  const Y = ([r, g, b]) => 0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.072175 * b ** 2.4;
  const clamp = (y) => (y < 0.022 ? y + (0.022 - y) ** 1.414 : y);
  const yt = clamp(Y(fg));
  const yb = clamp(Y(bg));
  if (Math.abs(yb - yt) < 0.0005) return 0;
  if (yb > yt) {
    const sapc = (yb ** 0.56 - yt ** 0.57) * 1.14;
    return sapc < 0.1 ? 0 : (sapc - 0.027) * 100;
  }
  const sapc = (yb ** 0.65 - yt ** 0.62) * 1.14;
  return sapc > -0.1 ? 0 : (sapc + 0.027) * 100;
}

// ── Token resolution ───────────────────────────────────────────────────────
function declarations(css) {
  // Comments mention token names ("--kernel-x: …") that aren't declarations.
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const map = new Map();
  for (const m of css.matchAll(/(--kernel-[\w-]+)\s*:\s*([^;]+);/g)) if (!map.has(m[1])) map.set(m[1], m[2].trim());
  return map;
}

/** The declarations inside `@supports (color: contrast-color(…))` blocks. */
function contrastColorBranch(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const map = new Map();
  for (const block of css.matchAll(/@supports\s*\(color:\s*contrast-color\([^)]*\)\)\s*\{([^}]*)\}/g))
    for (const m of block[1].matchAll(/(--kernel-[\w-]+)\s*:\s*([^;]+);/g)) map.set(m[1], m[2].trim());
  return map;
}

/** Splits a function's top-level comma/space separated arguments. */
function splitTop(text, sep) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === sep && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function resolver(vars) {
  const number = (expr) => {
    expr = expr.trim();
    const v = expr.match(/^var\((--[\w-]+)\)$/);
    if (v) return number(vars.get(v[1]));
    const c = expr.match(/^calc\((.*)\)$/);
    if (c) {
      const [left, right] = c[1].split("*").map((x) => x.trim());
      return number(left) * Number(right);
    }
    return parseFloat(expr);
  };
  /** Returns [L (0–1), C, H] for an expression that resolves to oklch(). */
  const oklchOf = (expr, scheme) => {
    expr = expr.trim();
    const v = expr.match(/^var\((--[\w-]+)\)$/);
    if (v) return oklchOf(vars.get(v[1]), scheme);
    const ld = expr.match(/^light-dark\((.*)\)$/);
    if (ld) {
      const [light, dark] = splitTop(ld[1], ",");
      return oklchOf(scheme === "light" ? light : dark, scheme);
    }
    const ok = expr.match(/^oklch\((.*)\)$/);
    if (!ok) throw new Error(`can't read oklch from "${expr}"`);
    const [L, C, H] = splitTop(ok[1], " ");
    return [parseFloat(L) / 100, number(C), number(H)];
  };
  /** Returns sRGB for one scheme ("light" or "dark"). */
  const colour = (expr, scheme) => {
    expr = expr.trim();
    const v = expr.match(/^var\((--[\w-]+)\)$/);
    if (v) {
      if (!vars.has(v[1])) throw new Error(`unresolved ${v[1]}`);
      return colour(vars.get(v[1]), scheme);
    }
    const ld = expr.match(/^light-dark\((.*)\)$/);
    if (ld) {
      const [light, dark] = splitTop(ld[1], ",");
      return colour(scheme === "light" ? light : dark, scheme);
    }
    // contrast-color() resolves to white or black, whichever has the higher
    // WCAG 2 contrast with its argument, which is what shipping engines do.
    const cc = expr.match(/^contrast-color\((.*)\)$/);
    if (cc) {
      const bg = colour(cc[1], scheme);
      return wcagRatio([1, 1, 1], bg) >= wcagRatio([0, 0, 0], bg) ? [1, 1, 1] : [0, 0, 0];
    }
    // Only the `color-mix(in oklch, <colour> N%, black)` form tokens.css uses:
    // black is oklch(0 0 none), so the mix scales L and C and keeps H.
    const mix = expr.match(/^color-mix\(in oklch,\s*(.*)\)$/);
    if (mix) {
      const [a, b] = splitTop(mix[1], ",");
      const pct = a.match(/\s([\d.]+)%$/);
      if (b !== "black" || !pct) throw new Error(`can't resolve colour "${expr}"`);
      const [L, C, H] = oklchOf(a.slice(0, pct.index), scheme);
      const t = parseFloat(pct[1]) / 100;
      return oklchToSrgb(L * t, C * t, H);
    }
    const ok = expr.match(/^oklch\((.*)\)$/);
    if (ok) {
      const [L, C, H] = splitTop(ok[1], " ");
      return oklchToSrgb(parseFloat(L) / 100, number(C), number(H));
    }
    throw new Error(`can't resolve colour "${expr}"`);
  };
  return colour;
}

const base = declarations(tokens);
const modern = contrastColorBranch(tokens);
const presets = [["default", new Map()]];
for (const file of readdirSync(join(root, "packages/styles/src/themes")).filter((f) => f.endsWith(".css") && f !== "index.css")) {
  presets.push([file.replace(".css", ""), declarations(readFileSync(join(root, "packages/styles/src/themes", file), "utf8"))]);
}

const failures = [];
const rows = [];
for (const [preset, overrides] of presets) {
  const colour = resolver(new Map([...base, ...overrides]));
  // The same preset as a browser that supports contrast-color() resolves it.
  const colours = [colour, resolver(new Map([...base, ...modern, ...overrides]))];
  for (const scheme of ["light", "dark"]) {
    for (const rule of RULES) {
      const fg = colour(`var(${rule.token})`, scheme);
      let worstLc = Infinity;
      let worstRatio = Infinity;
      for (const bgToken of rule.backgrounds ?? BACKGROUNDS) {
        const bg = colour(`var(${bgToken})`, scheme);
        worstLc = Math.min(worstLc, Math.abs(apca(fg, bg)));
        worstRatio = Math.min(worstRatio, wcagRatio(fg, bg));
      }
      const ok = worstLc >= rule.lc && worstRatio >= rule.ratio;
      rows.push(`${ok ? "✓" : "✗"} ${preset.padEnd(8)} ${scheme.padEnd(5)} ${rule.use.padEnd(15)} Lc ${worstLc.toFixed(0).padStart(3)} (≥${rule.lc})  ${worstRatio.toFixed(2)}:1 (≥${rule.ratio})`);
      if (!ok) failures.push(rows.at(-1));
    }
    for (const pair of PAIRS) {
      let worstLc = Infinity;
      let worstRatio = Infinity;
      for (const resolve of colours) {
        const fg = resolve(`var(${pair.fg})`, scheme);
        for (const bgToken of pair.bgs) {
          const bg = resolve(`var(${bgToken})`, scheme);
          worstLc = Math.min(worstLc, Math.abs(apca(fg, bg)));
          worstRatio = Math.min(worstRatio, wcagRatio(fg, bg));
        }
      }
      const ok = worstLc >= pair.lc && worstRatio >= pair.ratio;
      rows.push(`${ok ? "✓" : "✗"} ${preset.padEnd(8)} ${scheme.padEnd(5)} ${pair.use.padEnd(15)} Lc ${worstLc.toFixed(0).padStart(3)} (≥${pair.lc})  ${worstRatio.toFixed(2)}:1 (≥${pair.ratio})`);
      if (!ok) failures.push(rows.at(-1));
    }
  }
}

if (process.argv.includes("--verbose") || failures.length) console.log(rows.join("\n"));
if (failures.length) {
  console.error(`\ncheck-contrast: ${failures.length} token/scheme combinations miss their APCA or WCAG 2 target.`);
  process.exit(1);
}
console.log(`check-contrast: ${rows.length} checks pass (APCA Lc and WCAG 2 ratio, ${presets.length} presets × light/dark).`);
