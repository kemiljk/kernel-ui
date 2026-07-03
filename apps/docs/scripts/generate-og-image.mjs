// Renders the homepage's OG/Twitter share image at build time: a plain
// object tree (Satori's JSX-free API) styled to match the live site —
// canvas/text/border colours are hex mirrors of the amber-theme oklch
// tokens in packages/styles/src/tokens.css, since Satori's CSS engine
// doesn't parse oklch()/light-dark(). Rendered once to SVG (Satori),
// then rasterised to PNG (resvg) — no headless browser needed, so this
// runs in a few hundred ms as a normal build step.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { decompress } from "wawoff2";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(__dirname, "..");

const WIDTH = 1200;
const HEIGHT = 630;

// Hex mirrors of the amber-theme tokens (light mode), see the header
// comment above for why these can't just be var(--kernel-*) references.
const colors = {
  canvas: "#fdfbf9",
  surface: "#f7f3ee",
  border: "#ddd6cc",
  text: "#2b2620",
  textMuted: "#726a5f",
  accent: "#e2963c",
  onAccent: "#241f19",
  success: "#3d9a62",
};

// The *static* @fontsource/stack-sans-text package (not the
// @fontsource-variable one the site itself uses) — Satori's font parser
// (@shuding/opentype.js) chokes on the variable font's `fvar` axis table,
// so this build script deliberately uses the per-weight static files
// instead. Build-time-only dependency; doesn't affect what ships to the
// browser.
function fontDir() {
  return path.resolve(docsRoot, "node_modules/@fontsource/stack-sans-text/files");
}

// Satori's font parser only reads raw TTF/OTF `sfnt` data, not WOFF or
// WOFF2 — the only format @fontsource ships. `wawoff2` decompresses the
// WOFF2 container back into the plain sfnt table data it was built from,
// entirely offline (no network fetch of a separately-hosted font).
async function loadWeight(dir, weight) {
  const woff2 = await readFile(path.join(dir, `stack-sans-text-latin-${weight}-normal.woff2`));
  return Buffer.from(await decompress(woff2));
}

async function loadFonts() {
  const dir = fontDir();
  const [regular, bold] = await Promise.all([loadWeight(dir, 400), loadWeight(dir, 700)]);
  return [
    { name: "Stack Sans Text", data: regular, weight: 400, style: "normal" },
    { name: "Stack Sans Text", data: bold, weight: 700, style: "normal" },
  ];
}

function textLine(children, style) {
  return {
    type: "div",
    props: {
      style: { display: "flex", ...style },
      children,
    },
  };
}

// Mock component chips — echoes the homepage showcase, redrawn as plain
// divs (Satori can't render actual React components).
function componentChip({ rotate, top, left, children, style }) {
  return {
    type: "div",
    props: {
      style: {
        position: "absolute",
        top,
        left,
        transform: `rotate(${rotate}deg)`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 20px",
        borderRadius: 999,
        backgroundColor: colors.canvas,
        border: `1px solid ${colors.border}`,
        fontSize: 20,
        color: colors.text,
        ...style,
      },
      children,
    },
  };
}

function dot(bg) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        width: 14,
        height: 14,
        borderRadius: 999,
        backgroundColor: bg,
      },
    },
  };
}

function buildTree() {
  return {
    type: "div",
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        position: "relative",
        backgroundColor: colors.canvas,
        fontFamily: "Stack Sans Text",
        padding: "72px 80px",
      },
      children: [
        // Fanned component chips, right edge — decorative, not a screenshot.
        componentChip({
          rotate: -5,
          top: 48,
          left: 820,
          children: [
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  padding: "6px 18px",
                  borderRadius: 999,
                  backgroundColor: colors.accent,
                  color: colors.onAccent,
                  fontWeight: 700,
                  fontSize: 18,
                },
                children: "Save changes",
              },
            },
          ],
        }),
        componentChip({
          rotate: 4,
          top: 148,
          left: 960,
          children: [dot(colors.accent), { type: "div", props: { children: "Auto-save" } }],
        }),
        componentChip({
          rotate: -3,
          top: 248,
          left: 870,
          style: { padding: "10px 16px" },
          children: [
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  width: 44,
                  height: 26,
                  borderRadius: 999,
                  backgroundColor: colors.accent,
                  padding: 3,
                },
                children: {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      width: 20,
                      height: 20,
                      borderRadius: 999,
                      backgroundColor: colors.canvas,
                      marginLeft: "auto",
                    },
                  },
                },
              },
            },
          ],
        }),
        componentChip({
          rotate: 6,
          top: 340,
          left: 990,
          style: { padding: "10px 18px", borderRadius: 12 },
          children: [
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: `2px solid ${colors.accent}`,
                  backgroundColor: colors.accent,
                  alignItems: "center",
                  justifyContent: "center",
                  color: colors.onAccent,
                  fontSize: 14,
                  fontWeight: 700,
                },
                children: "✓",
              },
            },
            { type: "div", props: { children: "Remember me" } },
          ],
        }),
        componentChip({
          rotate: -4,
          top: 430,
          left: 900,
          children: [
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  padding: "4px 12px",
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  fontSize: 14,
                  fontWeight: 700,
                  color: colors.success,
                },
                children: "Stable",
              },
            },
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: colors.textMuted,
                },
                children: "KU",
              },
            },
            { type: "div", props: { children: "Kernel" } },
          ],
        }),
        componentChip({
          rotate: 3,
          top: 520,
          left: 1010,
          style: { padding: "8px 14px", borderRadius: 12 },
          children: [
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  padding: "8px 14px",
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  fontSize: 16,
                  color: colors.textMuted,
                },
                children: "Search…",
              },
            },
          ],
        }),

        // Main copy, left-aligned — explicit line breaks avoid Satori's
        // awkward auto-wrapping at share-preview sizes.
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 22,
              maxWidth: 560,
              marginTop: "auto",
              marginBottom: "auto",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 20,
                    fontWeight: 700,
                    color: colors.accent,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  },
                  children: [dot(colors.accent), { type: "div", props: { children: "Kernel" } }],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    fontSize: 50,
                    fontWeight: 700,
                    lineHeight: 1.08,
                    color: colors.text,
                  },
                  children: [
                    textLine("The kernel of the web,"),
                    textLine("componentised."),
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    fontSize: 24,
                    lineHeight: 1.35,
                    color: colors.textMuted,
                  },
                  children: [
                    textLine("A component library built on real semantic HTML"),
                    textLine("instead of div soup."),
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

async function main() {
  const fonts = await loadFonts();
  const svg = await satori(buildTree(), { width: WIDTH, height: HEIGHT, fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } });
  const png = resvg.render().asPng();
  const outPath = path.join(docsRoot, "public", "og.png");
  await writeFile(outPath, png);
  console.log(`Wrote ${path.relative(docsRoot, outPath)} (${png.byteLength} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
