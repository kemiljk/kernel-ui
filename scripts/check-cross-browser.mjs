#!/usr/bin/env node
/**
 * Cross-browser behaviour checks against the built docs site: the things
 * that differ between engines, input types, text direction and motion
 * preference, which the APG pattern checks (check-patterns) and axe
 * (check-a11y) don't cover.
 *
 *   - Popover menu: open, Escape, focus back on the trigger.
 *   - Dialog and Sheet: open, Escape, light dismiss on the backdrop,
 *     `closedby`, focus return.
 *   - Toast swipe and Sheet drag with touch: pointer events with
 *     pointerType "touch" in every engine, and real touch input through CDP
 *     in Chromium, where `touch-action` is honoured (a vertical pan on a
 *     toast must stay a scroll; a horizontal swipe must dismiss). Toast
 *     swipe direction in RTL (toward inline-end, so left).
 *   - TodoList reorder with and without element-scoped view transitions
 *     (FLIP fallback), and under reduced motion.
 *   - StreamingMarkdown: streams, and markup in the source stays inert.
 *   - ModelPicker keyboard, ArtifactPanel overlay focus trap,
 *     SchemaRenderer render, Select (base-select or native fallback),
 *     CommandPalette filter + first-result highlight, TagInput structure.
 *   - The same checks on the Custom Elements lab page where they apply.
 *
 * Usage: `bun run docs:build`, then
 *   node scripts/check-cross-browser.mjs [--browser=chromium|firefox|webkit|all] [check-name-filter]
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { launchBrowser, parseBrowsers, withoutBrowserFlag } from "./lib/browsers.mjs";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "apps/docs/dist");
if (!existsSync(dist)) {
  console.error("check-cross-browser: apps/docs/dist not found. Run `bun run docs:build` first.");
  process.exit(1);
}
const argv = process.argv.slice(2);
const engines = parseBrowsers(argv, { script: "check-cross-browser" });
const filters = withoutBrowserFlag(argv).filter((a) => !a.startsWith("--"));

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain", ".md": "text/markdown" };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join(dist, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Waits for the page's islands to hydrate (Astro drops `ssr` when done). */
async function hydrate(page) {
  await page.evaluate(async () => {
    const deadline = Date.now() + 15000;
    for (const island of document.querySelectorAll("astro-island[ssr]")) {
      (island.firstElementChild ?? island).scrollIntoView({ block: "center" });
      while (island.hasAttribute("ssr") && Date.now() < deadline) await new Promise((r) => setTimeout(r, 20));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

async function open(page, path, { dir } = {}) {
  await page.goto(`${base}${path}`, { waitUntil: "load" });
  if (dir) await page.evaluate((d) => document.documentElement.setAttribute("dir", d), dir);
  await hydrate(page);
  await page.waitForTimeout(150);
}

/** The element focus is on, looking through shadow roots. */
const focused = (page) =>
  page.evaluate(() => {
    let el = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    return el ? { tag: el.tagName.toLowerCase(), text: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 60), role: el.getAttribute("role") } : null;
  });

/**
 * A touch drag as pointer events (pointerType "touch"), dispatched on the
 * element under the start point. Runs in every engine; it exercises the
 * component's own gesture code but not the browser's touch-action handling.
 */
async function syntheticTouchDrag(page, selector, dx, dy, { steps = 12, stepMs = 12, from = "center" } = {}) {
  return page.evaluate(
    async ({ selector, dx, dy, steps, stepMs, from }) => {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`no ${selector}`);
      const r = el.getBoundingClientRect();
      const x0 = from === "top" ? r.left + r.width / 2 : r.left + r.width / 2;
      const y0 = from === "top" ? r.top + 8 : r.top + r.height / 2;
      const target = document.elementFromPoint(x0, y0) ?? el;
      const init = (x, y, extra = {}) => ({ bubbles: true, cancelable: true, composed: true, pointerId: 41, pointerType: "touch", isPrimary: true, clientX: x, clientY: y, button: 0, buttons: 1, ...extra });
      target.dispatchEvent(new PointerEvent("pointerdown", init(x0, y0)));
      for (let i = 1; i <= steps; i++) {
        await new Promise((r) => setTimeout(r, stepMs));
        const x = x0 + (dx * i) / steps;
        const y = y0 + (dy * i) / steps;
        (el.hasPointerCapture?.(41) ? el : target).dispatchEvent(new PointerEvent("pointermove", init(x, y)));
      }
      (el.hasPointerCapture?.(41) ? el : target).dispatchEvent(new PointerEvent("pointerup", init(x0 + dx, y0 + dy, { buttons: 0 })));
      return true;
    },
    { selector, dx, dy, steps, stepMs, from },
  );
}

/** Real touch input through CDP (Chromium only): the browser does hit
 * testing, implicit capture and touch-action, exactly as on a phone. */
async function cdpTouchDrag(page, x0, y0, dx, dy, { steps = 12, stepMs = 12 } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const point = (x, y) => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(x0, y0) });
  for (let i = 1; i <= steps; i++) {
    await sleep(stepMs);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(x0 + (dx * i) / steps, y0 + (dy * i) / steps) });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

const results = [];
let engine;
let browser;

async function check(name, fn, contextOptions = {}) {
  if (filters.length && !filters.some((f) => name.includes(f))) return;
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...contextOptions });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const outcome = await Promise.race([fn(page, context), sleep(45000).then(() => { throw new Error("timed out after 45s"); })]);
    if (outcome?.skip) {
      results.push({ engine, name, status: "skip", detail: outcome.skip });
      console.log(`  - [${engine}] ${name} (skipped: ${outcome.skip})`);
    } else {
      assert(!errors.length, `page errors: ${errors.join(" | ")}`);
      results.push({ engine, name, status: "pass" });
      console.log(`  ✓ [${engine}] ${name}`);
    }
  } catch (error) {
    results.push({ engine, name, status: "fail", detail: String(error?.message ?? error) });
    console.error(`  ✗ [${engine}] ${name}\n      ${String(error?.message ?? error).split("\n").join("\n      ")}`);
  } finally {
    await context.close();
  }
}

// ── Checks ────────────────────────────────────────────────────────────

const checks = [];
const def = (name, fn, contextOptions) => checks.push({ name, fn, contextOptions });

def("dropdown-menu: click opens, Escape closes, focus returns to trigger", async (page) => {
  await open(page, "/components/dropdown-menu/");
  const trigger = page.locator(".docs-example [popovertarget], .docs-example button[aria-haspopup]").first();
  await trigger.click();
  const menu = page.locator(".docs-example [popover]:popover-open").first();
  await menu.waitFor({ timeout: 2000 });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector(".docs-example [popover]:popover-open"), null, { timeout: 2000 });
  const f = await focused(page);
  const triggerText = (await trigger.textContent()).trim();
  assert(f && f.text.includes(triggerText.slice(0, 10)), `focus after Escape on ${JSON.stringify(f)}, expected trigger "${triggerText}"`);
});

def("popover: Escape closes and focus returns to trigger", async (page) => {
  await open(page, "/components/popover/");
  const trigger = page.locator(".docs-example [popovertarget]").first();
  await trigger.click();
  await page.locator(".docs-example [popover]:popover-open").first().waitFor({ timeout: 2000 });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector(".docs-example [popover]:popover-open"), null, { timeout: 2000 });
  const f = await focused(page);
  assert(f?.tag === "button", `focus after Escape: ${JSON.stringify(f)}`);
});

async function openDialog(page, path, buttonName) {
  await open(page, path);
  const trigger = page.locator(".docs-example").first().getByRole("button", { name: buttonName });
  await trigger.click();
  const dialog = page.locator("dialog[open]").first();
  await dialog.waitFor({ timeout: 2000 });
  await page.waitForTimeout(450); // entrance
  return { trigger, dialog };
}

def("dialog: opens modal, Escape closes, focus returns", async (page) => {
  const { dialog } = await openDialog(page, "/components/dialog/", "Invite a teammate");
  assert(await dialog.evaluate((d) => d.matches(":modal")), "dialog not modal");
  const inside = await page.evaluate(() => document.querySelector("dialog[open]").contains(document.activeElement));
  assert(inside, "focus not inside the dialog on open");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("dialog[open]"), null, { timeout: 3000 });
  await page.waitForTimeout(100); // the `close` event, and any focus restore on it, is a task later
  const f = await focused(page);
  assert(f?.text.includes("Invite a teammate"), `focus after close: ${JSON.stringify(f)}`);
});

def("dialog: backdrop click light-dismisses (closedby=any)", async (page) => {
  const { dialog } = await openDialog(page, "/components/dialog/", "Invite a teammate");
  const closedby = await dialog.getAttribute("closedby");
  const box = await dialog.boundingBox();
  await page.mouse.click(Math.max(5, box.x - 40), Math.max(5, box.y - 40));
  const closed = await page.waitForFunction(() => !document.querySelector("dialog[open]"), null, { timeout: 3000 }).then(() => true, () => false);
  assert(closed, `backdrop click didn't close the dialog (closedby=${closedby})`);
});

def("sheet: opens, Escape closes, focus returns", async (page) => {
  const { dialog } = await openDialog(page, "/components/sheet/", "Recently played");
  assert(await dialog.evaluate((d) => d.matches(":modal")), "sheet not modal");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("dialog[open]"), null, { timeout: 3000 });
  await page.waitForTimeout(100);
  const f = await focused(page);
  assert(f?.text.includes("Recently played"), `focus after close: ${JSON.stringify(f)}`);
});

def("sheet: backdrop click closes", async (page) => {
  const { dialog } = await openDialog(page, "/components/sheet/", "Recently played");
  const box = await dialog.boundingBox();
  // The sheet rises from the bottom; the backdrop is above it.
  await page.mouse.click(box.x + box.width / 2, Math.max(5, box.y - 60));
  const closed = await page.waitForFunction(() => !document.querySelector("dialog[open]"), null, { timeout: 3000 }).then(() => true, () => false);
  assert(closed, "backdrop click didn't close the sheet");
});

/** The draggable part of the open sheet (its handle when handleOnly). */
const SHEET_HANDLE = "dialog[open] [class*='Sheet-handle'], dialog[open] [data-sheet-handle]";

def("sheet: touch drag down on the handle dismisses (synthetic touch pointer events)", async (page) => {
  await openDialog(page, "/components/sheet/", "Recently played");
  const handle = await page.$(SHEET_HANDLE);
  assert(handle, "no sheet handle found");
  await syntheticTouchDrag(page, SHEET_HANDLE, 0, 320, { steps: 10, stepMs: 10 });
  const closed = await page.waitForFunction(() => !document.querySelector("dialog[open]"), null, { timeout: 3000 }).then(() => true, () => false);
  assert(closed, "dragging the handle down didn't dismiss the sheet");
}, { hasTouch: true });

def("sheet: real touch drag down on the handle dismisses (CDP, Chromium)", async (page) => {
  if (engine !== "chromium") return { skip: "CDP touch is Chromium-only" };
  await openDialog(page, "/components/sheet/", "Recently played");
  const box = await page.locator(SHEET_HANDLE).first().boundingBox();
  assert(box, "no sheet handle");
  await cdpTouchDrag(page, box.x + box.width / 2, box.y + box.height / 2, 0, 320, { steps: 10, stepMs: 10 });
  const closed = await page.waitForFunction(() => !document.querySelector("dialog[open]"), null, { timeout: 3000 }).then(() => true, () => false);
  assert(closed, "a real touch drag on the handle didn't dismiss the sheet");
}, { hasTouch: true, isMobile: false });

def("sheet: a short touch drag settles back open", async (page) => {
  await openDialog(page, "/components/sheet/", "Recently played");
  await syntheticTouchDrag(page, SHEET_HANDLE, 0, 30, { steps: 10, stepMs: 40 });
  await page.waitForTimeout(700);
  assert(await page.$("dialog[open]"), "a 30px slow drag dismissed the sheet");
}, { hasTouch: true });

/**
 * Drags the open side sheet off toward the physical edge it sits on, and
 * reports whether it was dismissed. `left`/`right` are logical, so under
 * RTL a `left` sheet is on the right-hand edge and leaves to the right.
 */
async function dragSideSheetOutward(page) {
  const box = await page.locator("dialog[open]").first().boundingBox();
  const width = await page.evaluate(() => innerWidth);
  const atRight = box.x + box.width >= width - 2;
  await page.evaluate(
    async ({ dx }) => {
      const d = document.querySelector("dialog[open]");
      const r = d.getBoundingClientRect();
      const x0 = r.left + r.width / 2;
      const y0 = r.top + 40;
      const t = document.elementFromPoint(x0, y0);
      const init = (x, y, buttons = 1) => ({ bubbles: true, cancelable: true, composed: true, pointerId: 43, pointerType: "touch", isPrimary: true, clientX: x, clientY: y, buttons });
      t.dispatchEvent(new PointerEvent("pointerdown", init(x0, y0)));
      for (let i = 1; i <= 10; i++) {
        await new Promise((r) => setTimeout(r, 10));
        (d.hasPointerCapture?.(43) ? d : t).dispatchEvent(new PointerEvent("pointermove", init(x0 + (dx * i) / 10, y0)));
      }
      (d.hasPointerCapture?.(43) ? d : t).dispatchEvent(new PointerEvent("pointerup", init(x0 + dx, y0, 0)));
    },
    { dx: atRight ? 400 : -400 },
  );
  const closed = await page.waitForFunction(() => !document.querySelector("dialog[open]"), null, { timeout: 3000 }).then(() => true, () => false);
  return { closed, atRight };
}

for (const dir of ["ltr", "rtl"]) {
  for (const side of ["left", "right"]) {
    const expectRight = (side === "right") === (dir === "ltr");
    def(`sheet (React): side="${side}" in ${dir} sits on the ${expectRight ? "right" : "left"} edge and drags off toward it`, async (page) => {
      await open(page, "/components/sheet/", { dir });
      const stage = page.locator(".prop-playground").first();
      const segment = page.getByRole("group", { name: "side" }).getByRole("button", { name: side, exact: true });
      if (!(await segment.count())) return { skip: "no side control on the Sheet playground" };
      await segment.click();
      await page.locator(".prop-playground-stage").first().getByRole("button").first().click();
      await page.locator("dialog[open]").first().waitFor({ timeout: 2000 });
      await page.waitForTimeout(600);
      const { closed, atRight } = await dragSideSheetOutward(page);
      assert(atRight === expectRight, `side="${side}" in ${dir} opened on the ${atRight ? "right" : "left"} edge`);
      assert(closed, `dragging the ${dir} side="${side}" sheet toward its edge didn't dismiss it`);
      void stage;
    }, { hasTouch: true });

    def(`sheet (elements): side="${side}" in ${dir} sits on the ${expectRight ? "right" : "left"} edge and drags off toward it`, async (page) => {
      await open(page, "/labs/elements/", { dir });
      await page.evaluate((side) => {
        const sheet = document.createElement("kernel-sheet");
        sheet.setAttribute("side", side);
        sheet.setAttribute("title", "Probe sheet");
        sheet.innerHTML = "<p>Body</p>";
        document.body.append(sheet);
        sheet.setAttribute("open", "");
      }, side);
      await page.locator("dialog[open]").first().waitFor({ timeout: 2000 });
      await page.waitForTimeout(600);
      const { closed, atRight } = await dragSideSheetOutward(page);
      assert(atRight === expectRight, `side="${side}" in ${dir} opened on the ${atRight ? "right" : "left"} edge`);
      assert(closed, `dragging the ${dir} side="${side}" sheet toward its edge didn't dismiss it`);
    }, { hasTouch: true });
  }
}

async function showToast(page, { dir } = {}) {
  await open(page, "/components/toast/", { dir });
  await page.locator(".docs-example").first().getByRole("button", { name: "Default" }).click();
  const toast = page.locator(".kernel-Toast-toast").first();
  await toast.waitFor({ timeout: 3000 });
  await page.waitForTimeout(500);
  return toast;
}
const TOAST = ".kernel-Toast-toast";
const toastGone = (page) => page.waitForFunction((sel) => !document.querySelector(sel), TOAST, { timeout: 3000 }).then(() => true, () => false);

def("toast: touch-action is pan-y", async (page) => {
  await showToast(page);
  const ta = await page.locator(TOAST).first().evaluate((el) => getComputedStyle(el).touchAction);
  assert(ta === "pan-y", `touch-action: ${ta}`);
}, { hasTouch: true });

for (const dir of ["ltr", "rtl"]) {
  const sign = dir === "rtl" ? -1 : 1;
  def(`toast: horizontal touch swipe toward inline-end dismisses (${dir}, synthetic)`, async (page) => {
    await showToast(page, { dir });
    // Watch the toast's x as it leaves, to check the exit direction too.
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      window.__toastStartX = el.getBoundingClientRect().left;
      window.__toastXs = [];
      const tick = () => {
        const t = document.querySelector(sel);
        if (!t) return;
        window.__toastXs.push(t.getBoundingClientRect().left);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, TOAST);
    await syntheticTouchDrag(page, TOAST, 220 * sign, 0, { steps: 10, stepMs: 8 });
    assert(await toastGone(page), `a ${dir} swipe toward inline-end didn't dismiss the toast`);
    const moved = await page.evaluate(() => {
      const xs = window.__toastXs;
      return xs.length ? xs[xs.length - 1] - window.__toastStartX : 0;
    });
    assert(Math.sign(moved) === sign, `toast left toward ${moved > 0 ? "the right" : "the left"} in ${dir} (moved ${moved.toFixed(0)}px)`);
  }, { hasTouch: true });

  def(`toast: swipe toward inline-start does not dismiss (${dir})`, async (page) => {
    await showToast(page, { dir });
    await syntheticTouchDrag(page, TOAST, -120 * sign, 0, { steps: 10, stepMs: 40 });
    await page.waitForTimeout(600);
    assert(await page.$(TOAST), `a ${dir} swipe toward inline-start dismissed the toast`);
  }, { hasTouch: true });
}

def("toast: real touch — horizontal swipe dismisses, vertical pan doesn't (CDP, Chromium)", async (page) => {
  if (engine !== "chromium") return { skip: "CDP touch is Chromium-only" };
  let toast = await showToast(page);
  let box = await toast.boundingBox();
  // Vertical: touch-action: pan-y hands it to the browser (pointercancel), so the toast stays.
  await cdpTouchDrag(page, box.x + box.width / 2, box.y + box.height / 2, 0, -150);
  await page.waitForTimeout(500);
  assert(await page.$(TOAST), "a vertical touch pan on the toast dismissed it");
  box = await page.locator(TOAST).first().boundingBox();
  await cdpTouchDrag(page, box.x + box.width / 2, box.y + box.height / 2, 220, 0, { steps: 10, stepMs: 8 });
  assert(await toastGone(page), "a real horizontal touch swipe didn't dismiss the toast");
}, { hasTouch: true });

def("toast: vertical touch pan scrolls the page underneath (CDP, Chromium)", async (page) => {
  if (engine !== "chromium") return { skip: "CDP touch is Chromium-only" };
  const toast = await showToast(page);
  await page.evaluate(() => window.scrollTo(0, 400));
  const before = await page.evaluate(() => window.scrollY);
  const box = await toast.boundingBox();
  await cdpTouchDrag(page, box.x + box.width / 2, box.y + box.height / 2, 0, 200, { steps: 10, stepMs: 16 });
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.scrollY);
  assert(after < before, `page didn't scroll under a vertical pan on the toast (scrollY ${before} → ${after})`);
}, { hasTouch: true });

def("toast: reduced motion — swipe still dismisses", async (page) => {
  await showToast(page);
  await syntheticTouchDrag(page, TOAST, 220, 0, { steps: 10, stepMs: 8 });
  assert(await toastGone(page), "swipe didn't dismiss under reduced motion");
}, { hasTouch: true, reducedMotion: "reduce" });

async function todoOrder(page) {
  return page.locator(".docs-example").first().locator("ol > li").allTextContents();
}
async function reorderTodo(page, { disableViewTransition = false } = {}) {
  await open(page, "/components/todo-list/");
  if (disableViewTransition) {
    await page.evaluate(() => {
      delete HTMLElement.prototype.startViewTransition;
      Element.prototype.startViewTransition = undefined;
    });
  }
  // Track animations started on the items (FLIP uses element.animate()).
  await page.evaluate(() => {
    window.__animations = 0;
    const original = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this.closest?.(".docs-example ol")) window.__animations++;
      return original.apply(this, args);
    };
  });
  const before = await todoOrder(page);
  await page.locator(".docs-example").first().getByRole("button", { name: "Reprioritise" }).click();
  await page.waitForTimeout(600);
  const after = await todoOrder(page);
  const animations = await page.evaluate(() => window.__animations);
  return { before, after, animations };
}

def("todo-list: reorder with the engine's own path (view transition or FLIP)", async (page) => {
  const { before, after } = await reorderTodo(page);
  assert(JSON.stringify(before) !== JSON.stringify(after), "order didn't change");
  assert(before.slice().sort().join() === after.slice().sort().join(), "items changed, not just order");
});

def("todo-list: reorder falls back to FLIP without element.startViewTransition", async (page) => {
  const { before, after, animations } = await reorderTodo(page, { disableViewTransition: true });
  assert(JSON.stringify(before) !== JSON.stringify(after), "order didn't change");
  assert(animations > 0, "no FLIP animation ran without view transitions");
});

def("todo-list: reduced motion reorders in place, no animation", async (page) => {
  const { before, after, animations } = await reorderTodo(page, { disableViewTransition: true });
  assert(JSON.stringify(before) !== JSON.stringify(after), "order didn't change");
  assert(animations === 0, `${animations} animation(s) ran under reduced motion`);
}, { reducedMotion: "reduce" });

def("streaming-markdown: streams to the full answer", async (page) => {
  await open(page, "/components/streaming-markdown/");
  const ex = page.locator(".docs-example").first();
  await page.waitForFunction(() => document.querySelector(".docs-example blockquote a"), null, { timeout: 20000 });
  assert(await ex.locator("table").count(), "table never rendered");
  assert(await ex.locator("pre code").count(), "code block never rendered");
  const href = await ex.locator("blockquote a").first().getAttribute("href");
  assert(href === "/components/streaming-markdown/", `link href ${href}`);
});

def("streaming-markdown: HTML and javascript: URLs in the source stay inert", async (page) => {
  // The elements lab page defines every custom element, so the component
  // can be fed hostile source directly.
  await open(page, "/labs/elements/");
  const defined = await page.evaluate(() => !!customElements.get("kernel-streaming-markdown"));
  if (!defined) return { skip: "kernel-streaming-markdown isn't on the elements lab page" };
  const out = await page.evaluate(async () => {
    window.__xss = 0;
    const el = document.createElement("kernel-streaming-markdown");
    document.body.append(el);
    const payload = [
      "<img src=x onerror=\"window.__xss++\">",
      "",
      "[click](javascript:window.__xss++)",
      "",
      "<script>window.__xss++</script>",
      "",
      "![a](javascript:window.__xss++)",
      "",
      "[data](data:text/html,<script>parent.__xss++</script>)",
    ].join("\n");
    // Stream it in a character at a time, so partial tags are seen too.
    for (let i = 1; i <= payload.length; i += 3) {
      el.content = payload.slice(0, i);
      el.setAttribute("streaming", "");
      await new Promise((r) => setTimeout(r, 0));
    }
    el.content = payload;
    el.removeAttribute("streaming");
    await new Promise((r) => setTimeout(r, 100));
    const links = Array.from(el.querySelectorAll("a, img, script, iframe")).map((n) => `${n.tagName}:${n.getAttribute("href") ?? n.getAttribute("src") ?? ""}`);
    for (const a of el.querySelectorAll("a")) a.click();
    await new Promise((r) => setTimeout(r, 100));
    return { xss: window.__xss, links, text: el.textContent.slice(0, 200) };
  });
  assert(out.xss === 0, `script ran: ${JSON.stringify(out)}`);
  assert(!out.links.some((l) => /^(SCRIPT|IFRAME)|javascript:|data:/i.test(l)), `unsafe node or URL rendered: ${out.links.join(", ")}`);
});

def("model-picker: keyboard opens, arrows move, Enter selects, focus returns", async (page) => {
  await open(page, "/components/model-picker/");
  const ex = page.locator(".docs-example").first();
  const trigger = ex.locator("button[aria-haspopup], [role='combobox'], button[popovertarget]").first();
  const before = (await trigger.textContent()).trim();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("[popover]:popover-open, [role='listbox']"), null, { timeout: 2000 });
  await page.waitForTimeout(100);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  const after = (await trigger.textContent()).trim();
  assert(after !== before, `selection didn't change (${before} → ${after})`);
  const open_ = await page.evaluate(() => !!document.querySelector(".docs-example [popover]:popover-open"));
  assert(!open_, "picker stayed open after Enter");
  const f = await focused(page);
  assert(f && (await trigger.evaluate((t, f) => t.contains(document.activeElement) || document.activeElement === t, f)), `focus after select: ${JSON.stringify(f)}`);
});

def("artifact-panel: overlay (narrow) traps focus and Escape closes", async (page) => {
  await open(page, "/components/artifact-panel/");
  const dialog = page.locator(".docs-example dialog[open], dialog[open]").first();
  if (!(await dialog.count())) {
    const openBtn = page.locator(".docs-example").first().getByRole("button", { name: /open|view|show|artifact/i }).first();
    if (await openBtn.count()) await openBtn.click();
  }
  await page.waitForTimeout(500);
  const modal = await page.evaluate(() => {
    const d = document.querySelector("dialog[open]");
    return d ? d.matches(":modal") : null;
  });
  if (modal === null) return { skip: "no overlay opened at this width" };
  assert(modal, "overlay isn't a modal dialog");
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    // A modal <dialog> lets Tab out to the browser's own chrome (focus then
    // reads as <body>, and the next Tab comes back in); what it must never
    // do is land on page content behind the overlay.
    const where = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return "chrome";
      return document.querySelector("dialog[open]")?.contains(a) ? "inside" : `${a.tagName.toLowerCase()} "${(a.textContent || "").trim().slice(0, 40)}"`;
    });
    assert(where === "inside" || where === "chrome", `Tab ${i + 1} reached ${where} behind the overlay`);
  }
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("dialog[open]"), null, { timeout: 3000 });
}, { viewport: { width: 390, height: 844 }, hasTouch: true });

def("schema-renderer: renders the sample form with labelled fields", async (page) => {
  await open(page, "/components/schema-renderer/");
  const root = page.locator(".docs-example [data-slot='schema-renderer']").first();
  await root.waitFor({ timeout: 5000 });
  const unlabelled = await root.evaluate((r) =>
    Array.from(r.querySelectorAll("input:not([type=hidden]), select, textarea")).filter((el) => !el.labels?.length && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby")).length,
  );
  const fields = await root.locator("input, select, textarea, button").count();
  assert(fields > 0, "nothing rendered");
  assert(unlabelled === 0, `${unlabelled} unlabelled field(s)`);
});

def("select: base-select where supported, native fallback otherwise; keyboard changes value", async (page) => {
  await open(page, "/components/select/");
  const select = page.locator(".docs-example select").first();
  const { supported, appearance } = await select.evaluate((el) => ({ supported: CSS.supports("appearance", "base-select"), appearance: getComputedStyle(el).appearance }));
  if (supported) assert(appearance === "base-select", `base-select supported but appearance is ${appearance}`);
  else assert(appearance !== "base-select", `appearance ${appearance} without support`);
  const before = await select.inputValue();
  await select.selectOption({ index: 2 });
  const after = await select.inputValue();
  assert(after !== before, "selectOption didn't change the value");
  const height = await select.evaluate((el) => el.getBoundingClientRect().height);
  assert(height >= 28 && height <= 56, `fallback select height ${height}px looks unstyled`);
});

def("command-palette: filters fuzzily and highlights the first result", async (page) => {
  await open(page, "/components/command-palette/");
  await page.locator(".docs-example").first().getByRole("button", { name: "Open command palette" }).click();
  const input = page.locator("dialog[open] input, [popover]:popover-open input").first();
  await input.waitFor({ timeout: 2000 });
  await input.pressSequentially("nfld");
  await page.waitForTimeout(150);
  const options = await page.locator("dialog[open] [role='option'], [popover]:popover-open [role='option']").allTextContents();
  assert(options.length >= 1 && /New folder/.test(options[0]), `fuzzy "nfld" → ${JSON.stringify(options)}`);
  const active = await input.getAttribute("aria-activedescendant");
  const first = await page.locator("dialog[open] [role='option'], [popover]:popover-open [role='option']").first().getAttribute("id");
  assert(active && active === first, `first result not highlighted (activedescendant ${active}, first ${first})`);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  assert(await page.locator(".docs-example").first().getByText("Last selected: New folder").count(), "Enter didn't run the highlighted command");
});

def("tag-input: role=list wrapper with listitems, textbox outside the list", async (page) => {
  await open(page, "/components/tag-input/");
  const snap = await page.locator(".docs-example").first().ariaSnapshot();
  assert(/- list "Skills":\n\s+- listitem:/.test(snap), `no named list of listitems:\n${snap}`);
  assert(/^- textbox "Skills"/m.test(snap), `textbox not a sibling of the list:\n${snap}`);
  if (engine === "chromium") {
    // The engine's own tree, not Playwright's DOM-derived one.
    const cdp = await page.context().newCDPSession(page);
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    const list = nodes.find((n) => n.role?.value === "list" && n.name?.value === "Skills");
    assert(list, "Chromium's AX tree has no list named Skills");
    const kids = nodes.filter((n) => list.childIds?.includes(n.nodeId)).map((n) => n.role?.value);
    assert(kids.filter((r) => r === "listitem").length >= 2, `list children in Chromium's AX tree: ${kids}`);
    await cdp.detach();
  }
  // Layout: chips and input share the field's line.
  const geom = await page.locator(".docs-example").first().evaluate((ex) => {
    const chip = ex.querySelector("[role=listitem]").getBoundingClientRect();
    const input = ex.querySelector("input").getBoundingClientRect();
    return { chipTop: chip.top, chipBottom: chip.bottom, inputTop: input.top, inputBottom: input.bottom };
  });
  assert(geom.inputTop < geom.chipBottom && geom.inputBottom > geom.chipTop, `input not on the chips' line: ${JSON.stringify(geom)}`);
});

def("elements: kernel-tag-input has the same list structure", async (page) => {
  await open(page, "/labs/elements/");
  await page.evaluate(() => {
    const el = document.createElement("kernel-tag-input");
    el.id = "probe-tags";
    el.setAttribute("label", "Skills");
    el.setAttribute("value", "React,TypeScript");
    document.body.prepend(el);
  });
  const ti = page.locator("#probe-tags");
  await page.waitForTimeout(200);
  const snap = await ti.ariaSnapshot();
  assert(/- list "Skills":\n\s+- listitem:/.test(snap), `no named list of listitems:\n${snap}`);
  assert(/^- textbox "Skills"/m.test(snap), `textbox not a sibling of the list:\n${snap}`);
  const geom = await ti.evaluate((root) => {
    const chip = root.querySelector("[role=listitem]").getBoundingClientRect();
    const input = root.querySelector("input").getBoundingClientRect();
    return { chipTop: chip.top, chipBottom: chip.bottom, inputTop: input.top, inputBottom: input.bottom };
  });
  assert(geom.inputTop < geom.chipBottom && geom.inputBottom > geom.chipTop, `input not on the chips' line: ${JSON.stringify(geom)}`);
});

def("elements: kernel-dialog Escape closes and focus returns", async (page) => {
  await open(page, "/labs/elements/");
  const dialogs = await page.locator("kernel-dialog").count();
  if (!dialogs) return { skip: "no kernel-dialog on the lab page" };
  const trigger = page.getByRole("button", { name: /open dialog/i }).first();
  if (!(await trigger.count())) return { skip: "no dialog trigger on the lab page" };
  await trigger.click();
  await page.waitForFunction(() => document.querySelector("dialog[open]") || [...document.querySelectorAll("kernel-dialog")].some((d) => d.shadowRoot?.querySelector("dialog[open]")), null, { timeout: 2000 });
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  const f = await focused(page);
  assert(f?.tag === "button" && /open dialog/i.test(f.text), `focus after Escape: ${JSON.stringify(f)}`);
});

// ── Run ───────────────────────────────────────────────────────────────

for (engine of engines) {
  try {
    browser = await launchBrowser(engine);
  } catch (error) {
    results.push({ engine, name: "launch", status: "fail", detail: error.message });
    console.error(`  ✗ [${engine}] ${error.message}`);
    continue;
  }
  console.log(`${engine} ${browser.version()}`);
  for (const { name, fn, contextOptions } of checks) await check(name, fn, contextOptions);
  await browser.close();
}
server.close();

const summary = engines.map((e) => {
  const rows = results.filter((r) => r.engine === e);
  return `${e}: ${rows.filter((r) => r.status === "pass").length} passed, ${rows.filter((r) => r.status === "fail").length} failed, ${rows.filter((r) => r.status === "skip").length} skipped`;
});
console.log(`\ncheck-cross-browser: ${summary.join("; ")}.`);
if (results.some((r) => r.status === "fail")) process.exit(1);
