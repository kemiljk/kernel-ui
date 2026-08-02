/**
 * Captures the open transition as a labelled filmstrip so the motion can be
 * reviewed by eye, not just by numbers. Writes a single PNG montage.
 */
import { readFileSync, mkdtempSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const out = process.argv[2] ?? join(mkdtempSync(join(tmpdir(), "filmstrip-")), "strip.png");

const css = [
  read("packages/styles/src/tokens.css"),
  read("packages/styles/src/reset.css"),
  read("packages/elements/dist/kernel.css"),
].join("\n");
const elementsJs = read("packages/elements/dist/index.js");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 220 } });
await page.setContent(
  `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">
   <div id="stage" style="padding:16px">
     <kernel-accordion type="multiple">
       <kernel-accordion-item title="What is Kernel?">
         <p style="margin:0 0 8px">A component library built on real HTML elements.</p>
         <p style="margin:0">Second line so the panel has height to travel.</p>
       </kernel-accordion-item>
     </kernel-accordion>
   </div></body></html>`,
);
await page.addStyleTag({ content: css });
await page.addScriptTag({ content: elementsJs, type: "module" });
await page.waitForFunction(() => !!customElements.get("kernel-accordion-item"));
await page.waitForTimeout(200);

// Screenshot latency dwarfs a frame, so scrub the animation's own clock
// instead of racing it: pause on the first frame, then step `currentTime`.
await page.evaluate(() => {
  window.__d = document.querySelector("details.kernel-Accordion-item");
  window.__c = window.__d.querySelector(":scope > *:not(summary)");
  window.__d.open = false;
});
await page.waitForTimeout(150);

const timing = await page.evaluate(() => {
  window.__d.querySelector("summary").click();
  const anim = window.__c.getAnimations()[0];
  if (!anim) return null;
  anim.pause();
  anim.currentTime = 0;
  window.__anim = anim;
  return anim.effect.getTiming().duration;
});
if (!timing) throw new Error("no animation started on open — the panel snapped");

const STEPS = 8;
const shots = [];
const labels = [];
for (let i = 0; i < STEPS; i += 1) {
  const t = (timing * i) / (STEPS - 1);
  const measured = await page.evaluate((time) => {
    window.__anim.currentTime = time;
    return {
      panel: window.__c.getBoundingClientRect().height,
      box: window.__d.getBoundingClientRect().height,
    };
  }, t);
  shots.push(await page.screenshot());
  labels.push(`${Math.round(t)}ms · panel ${measured.panel.toFixed(0)}px · box ${measured.box.toFixed(0)}px`);
}

const montage = await page.evaluate(
  async ({ frames, captions, width, height }) => {
    const cols = 4;
    const rows = Math.ceil(frames.length / cols);
    const pad = 10;
    const canvas = document.createElement("canvas");
    canvas.width = (width + pad) * cols + pad;
    canvas.height = (height + pad) * rows + pad;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < frames.length; i += 1) {
      const x = pad + (i % cols) * (width + pad);
      const y = pad + Math.floor(i / cols) * (height + pad);
      const img = new Image();
      img.src = frames[i];
      await img.decode();
      ctx.drawImage(img, x, y);
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(x + 1, y + height - 22, width - 2, 21);
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.font = "bold 12px monospace";
      ctx.fillText(captions[i], x + 8, y + height - 7);
    }
    return canvas.toDataURL("image/png");
  },
  {
    frames: shots.map((b) => `data:image/png;base64,${b.toString("base64")}`),
    captions: labels,
    width: 420,
    height: 220,
  },
);

const { writeFileSync } = await import("node:fs");
writeFileSync(out, Buffer.from(montage.split(",")[1], "base64"));
console.log(out);
await browser.close();
