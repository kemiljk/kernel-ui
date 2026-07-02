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

// A small fanned cluster of mock component chips — the same "real
// components, not a logo" idea as the homepage showcase grid, redrawn
// here as plain divs (Satori can't render actual React components).
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
        boxShadow: "0 8px 20px rgba(43, 38, 32, 0.12)",
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
        padding: 80,
      },
      children: [
        // Fanned component chips, upper-right — decorative, echoes the
        // homepage showcase without trying to be a literal screenshot.
        componentChip({
          rotate: -6,
          top: 56,
          left: 700,
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
          top: 170,
          left: 880,
          children: [dot(colors.accent), { type: "div", props: { children: "Auto-save" } }],
        }),
        componentChip({
          rotate: -3,
          top: 300,
          left: 760,
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
          rotate: 5,
          top: 420,
          left: 860,
          children: [
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

        // Main copy, left-aligned.
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 24,
              maxWidth: 620,
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
                    fontSize: 22,
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
                    fontSize: 58,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    color: colors.text,
                  },
                  children: "The kernel of the web, componentised.",
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: 26,
                    lineHeight: 1.4,
                    color: colors.textMuted,
                  },
                  children:
                    "A component library built on real semantic HTML instead of div soup.",
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
