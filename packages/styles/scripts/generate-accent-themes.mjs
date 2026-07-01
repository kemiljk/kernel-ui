#!/usr/bin/env node
/**
 * Generates gamut-aware 12-step accent scales for a curated set of named
 * colour themes, the same shape as the flat curve in tokens.css but with
 * the chroma at every single step individually clamped to what sRGB can
 * actually display at that step's lightness and hue.
 *
 * Why this exists: `--kernel-hue-accent` in tokens.css is a live variable
 * consumers can set to any hue at runtime, so its chroma curve has to be
 * one flat, moderate value that's reasonably safe everywhere; browsers
 * silently gamut-map anything that goes out of bounds, and how hard they
 * clip varies by hue (blue and violet run out of headroom earlier than
 * green or orange do), which is exactly the inconsistency Radix's
 * hand-tuned-per-hue swatches avoid. For the fixed set of named theme
 * presets below, the hue is known ahead of time, so this script can do
 * the same per-hue gamut check Radix does by hand, and pick every step's
 * chroma to be the punchiest value that still stays in sRGB, rather than
 * relying on the browser to clip it for us.
 *
 * It also picks each theme's own accent-9-on-white-or-black foreground
 * colour by measured WCAG contrast rather than shipping one flat white
 * fallback for every hue: green and teal's step 9, at a fixed lightness
 * that works fine for blue/red/violet, contrasts better with black than
 * white (measured, not eyeballed), so a flat white fallback made them
 * genuinely hard to read. `contrast-color()` would handle this
 * automatically, but it's not reliably supported yet (see tokens.css),
 * so these presets bake in the measured answer instead of hoping for it.
 *
 * Run: node scripts/generate-accent-themes.mjs
 * Output: src/themes/<name>.css, one per theme, plus themes/index.css.
 */
import { converter, displayable } from "culori";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const outDir = fileURLToPath(new URL("../src/themes/", import.meta.url));
const toRgb = converter("rgb");

/** Named presets. Hues verified against well-known reference swatches
 * (Tailwind's palette, converted to OKLCH) rather than guessed, so the
 * name always matches what actually renders.
 *
 * Every theme shares the default LIGHT_L/DARK_L lightness curve below
 * *except* where a theme supplies its own `lightL`/`darkL`. That escape
 * hatch exists because the default curve pins step 9 ("the purest
 * step") to a fixed 56%/58% lightness, tuned for saturated hues like
 * blue or violet, whose in-gamut chroma ceiling happens to peak around
 * there. Warm/yellow hues peak much lighter (for hue 70, sRGB's max
 * chroma is around L 77-80%, not L 56%): forcing step 9 down to 56%
 * clips it to a muddy brown instead of the vivid gold the hue is
 * picked for. `amber`'s curve moves step 9 (and its neighbours, to
 * keep the ramp monotonic) up to where this specific hue is actually
 * at its punchiest, which is also what lands it on `#F59E0B`. */
const themes = [
  {
    name: "amber",
    hue: 70,
    lightL: [99, 98, 96, 93, 89, 85, 81, 79, 77, 68, 42, 20],
    darkL: [15, 19, 24, 28, 32, 37, 44, 52, 70, 74, 82, 95],
  },
  { name: "blue", hue: 260 },
  { name: "green", hue: 150 },
  { name: "red", hue: 25 },
  { name: "violet", hue: 293 },
  { name: "orange", hue: 48 },
  { name: "teal", hue: 183 },
];

// Same shape as the flat curve in tokens.css: lightness per step, and a
// chroma "intensity" multiplier per step (0 = neutral, 1 = the punchiest
// the ramp gets, at step 9). Shared default for every theme that doesn't
// override `lightL`/`darkL` above.
const LIGHT_L = [99, 97, 94, 90, 86, 81, 74, 65, 56, 50, 46, 24];
const LIGHT_C_MULT = [0.04, 0.08, 0.18, 0.3, 0.4, 0.5, 0.6, 0.75, 1, 0.95, 0.9, 0.6];
const DARK_L = [15, 19, 24, 28, 32, 37, 43, 50, 58, 64, 76, 93];
const DARK_C_MULT = [0.3, 0.4, 0.55, 0.7, 0.8, 0.85, 0.9, 0.95, 1, 0.9, 0.75, 0.35];

/** Target chroma if gamut were infinite. Real per-step chroma is
 * whichever is smaller of this and the sRGB ceiling at that L/H. */
const TARGET_CHROMA = 0.22;

const WHITE = "oklch(99% 0 0)";
const BLACK = "oklch(15% 0 0)";
const AA_NORMAL_TEXT = 4.5;

/** Binary search the maximum in-gamut OKLCH chroma for a given lightness
 * and hue, checked against sRGB (what `oklch()` ultimately gets painted
 * into on every current display). */
function maxChroma(l, h) {
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const inGamut = displayable({ mode: "oklch", l: l / 100, c: mid, h });
    if (inGamut) lo = mid;
    else hi = mid;
  }
  return lo;
}

function chromaFor(l, chromaMultiplier, hue) {
  const ceiling = maxChroma(l, hue);
  // 92% of the true edge: stays vivid without sitting exactly on the
  // gamut boundary, where hue can shift slightly on some displays.
  return Math.min(TARGET_CHROMA * chromaMultiplier, ceiling * 0.92);
}

function relativeLuminance({ r, g, b }) {
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(lumA, lumB) {
  const [a, b] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  return (a + 0.05) / (b + 0.05);
}

/** Black must beat white's contrast by at least this relative margin to
 * be picked; otherwise white wins by default. WCAG 2.x's relative
 * luminance weights the green channel heavily (0.7152 vs 0.0722 for
 * blue), which measures green/cyan hues as brighter than they read
 * perceptually — right where black and white end up within a few
 * points of each other (green/teal step 9 in light mode: black wins
 * by only 9% and 6% respectively), the formula's pick doesn't match
 * what the color actually looks like against either. A flat "whoever
 * has the bigger number wins" comparison takes that noise at face
 * value; requiring a decisive margin doesn't, and white is the safer
 * default on a tie since it's also just more common practice for
 * solid-fill buttons. Hues where black actually is right (amber: 78%
 * and 64% margins) are nowhere near this threshold and are unaffected. */
const BLACK_CONFIDENCE_MARGIN = 1.15;

/** Measure a colour's contrast against white and black, and return
 * whichever wins decisively, by how much, and whether it clears WCAG
 * AA for normal text (4.5:1) so a mismatch is visible in the generated
 * file and in this script's own console output rather than only on
 * screen. */
function bestForeground(l, c, h) {
  const lum = relativeLuminance(toRgb({ mode: "oklch", l: l / 100, c, h }));
  const whiteContrast = contrastRatio(lum, 1);
  const blackContrast = contrastRatio(lum, 0);
  const useWhite = !(blackContrast > whiteContrast * BLACK_CONFIDENCE_MARGIN);
  return {
    value: useWhite ? WHITE : BLACK,
    contrast: useWhite ? whiteContrast : blackContrast,
    passesAA: (useWhite ? whiteContrast : blackContrast) >= AA_NORMAL_TEXT,
  };
}

for (const { name, hue, lightL: themeLightL, darkL: themeDarkL } of themes) {
  const lightL = themeLightL ?? LIGHT_L;
  const darkL = themeDarkL ?? DARK_L;
  const lines = [
    `/**`,
    ` * Generated by scripts/generate-accent-themes.mjs. Do not hand-edit;`,
    ` * change the hue in that script and regenerate instead.`,
    ` *`,
    ` * A gamut-aware "${name}" accent scale: every one of the 12 steps below`,
    ` * uses the punchiest chroma that still renders in sRGB at that step's`,
    ` * lightness, individually checked for this hue, rather than one flat`,
    ` * chroma value shared across every hue (that's what --kernel-hue-accent`,
    ` * still does, deliberately, since it has to work for a hue nobody's`,
    ` * checked yet). Opt in with data-kernel-accent="${name}" on <html> or`,
    ` * any container.`,
    ` *`,
    ` * Also sets --kernel-hue-accent itself (not just the 12 pre-computed`,
    ` * --kernel-accent-* steps above): tokens.css defines`,
    ` * --kernel-hue-neutral as \`var(--kernel-hue-accent)\`, so the whole`,
    ` * --kernel-gray-* scale — canvas, surface, border, text, everything`,
    ` * neutral — picks up a faint wash of this theme's hue too, at`,
    ` * --kernel-chroma-neutral's very low chroma. Without this line the`,
    ` * 12 accent steps below would re-hue buttons and badges while the`,
    ` * rest of the page stayed on whatever hue --kernel-hue-accent's own`,
    ` * fallback in tokens.css happens to be, which reads as the accent`,
    ` * floating on top of an unrelated page rather than one coherent`,
    ` * theme. */`,
    `[data-kernel-accent="${name}"] {`,
    `  --kernel-hue-accent: ${hue};`,
  ];

  let step9Light;
  let step9Dark;

  for (let i = 0; i < 12; i++) {
    const step = i + 1;
    const lightC = chromaFor(lightL[i], LIGHT_C_MULT[i], hue);
    const darkC = chromaFor(darkL[i], DARK_C_MULT[i], hue);
    lines.push(
      `  --kernel-accent-${step}: light-dark(oklch(${lightL[i]}% ${lightC.toFixed(3)} ${hue}), oklch(${darkL[i]}% ${darkC.toFixed(3)} ${hue}));`,
    );
    if (step === 9) {
      step9Light = bestForeground(lightL[i], lightC, hue);
      step9Dark = bestForeground(darkL[i], darkC, hue);
    }
  }

  // Override the flat white fallback from tokens.css with whichever
  // foreground actually measures better against this theme's own
  // step 9, so text on a primary button is legible without depending
  // on contrast-color() support.
  lines.push(
    `  --kernel-color-on-accent: light-dark(${step9Light.value}, ${step9Dark.value});`,
  );

  lines.push(`}`, ``);
  writeFileSync(new URL(`${name}.css`, `file://${outDir}`), lines.join("\n"));

  const warn = (label, result) =>
    result.passesAA
      ? ""
      : ` [!] ${label} best option only reaches ${result.contrast.toFixed(2)}:1, below AA 4.5:1`;
  console.log(
    `${name.padEnd(8)} on-accent: light=${step9Light.value === WHITE ? "white" : "black"} (${step9Light.contrast.toFixed(2)}:1)${warn("light", step9Light)}` +
      `  dark=${step9Dark.value === WHITE ? "white" : "black"} (${step9Dark.contrast.toFixed(2)}:1)${warn("dark", step9Dark)}`,
  );
}

const indexLines = [
  `/**`,
  ` * All named accent themes in one import. Prefer importing a single`,
  ` * theme file (e.g. "@kernelui/styles/themes/blue.css") in production,`,
  ` * this convenience entry point is for demos and theme switchers that`,
  ` * need every preset available to flip between at runtime.`,
  ` */`,
  ...themes.map((t) => `@import "./${t.name}.css";`),
  ``,
];
writeFileSync(new URL(`index.css`, `file://${outDir}`), indexLines.join("\n"));

console.log(`\nGenerated ${themes.length} theme files in ${outDir}`);
