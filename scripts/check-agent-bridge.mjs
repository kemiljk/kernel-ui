#!/usr/bin/env node
/**
 * Browser check for @kernelui-lib/agent against real Kernel components:
 * serves the built docs (apps/docs/dist) plus the built bridge
 * (packages/agent/dist, at /__agent/), and drives real act() steps. It
 * asserts that the UI actually changed (React state included), not only
 * that act() reported success.
 *
 *   1. The agent bridge guide's demo: TextField, Switch, Select, Dialog,
 *      submit through ToolApproval, refusals, the sample run.
 *   2. Popover-based and composite React components on their docs pages:
 *      DropdownMenu, Popover, Select (base-select), Combobox, Tooltip (not
 *      actionable), Tabs, Accordion (<details name>), Slider and NumberField
 *      (setValue), TagInput (type + key Enter), DatePicker.
 *   3. @kernelui-lib/elements custom elements on the elements lab page:
 *      kernel-switch, kernel-select, kernel-dialog, kernel-tabs,
 *      kernel-dropdown-menu; plus a real open shadow root.
 *   4. WebMCP: a mock of the draft's document.modelContext.registerTool(),
 *      every tool executed with realistic input, abort unregisters; then
 *      the real thing in installed Chrome with --enable-features=WebMCP
 *      when that build has it (skipped, not failed, when it doesn't).
 *   5. axe on the demo, light and dark.
 *
 * Usage: `bun run docs:build`, then `node scripts/check-agent-bridge.mjs`.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "apps/docs/dist");
const agentDist = join(root, "packages/agent/dist");
if (!existsSync(join(dist, "agent-bridge", "index.html"))) {
  console.error("check-agent-bridge: apps/docs/dist/agent-bridge not found. Run `bun run docs:build` first.");
  process.exit(1);
}
if (!existsSync(join(agentDist, "index.js"))) {
  console.error("check-agent-bridge: packages/agent/dist not found. Run `bun run --cwd packages/agent build` first.");
  process.exit(1);
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ico": "image/x-icon", ".txt": "text/plain", ".md": "text/markdown" };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = path.startsWith("/__agent/") ? join(agentDist, path.slice("/__agent/".length)) : join(dist, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

async function launch(args = []) {
  try {
    return await chromium.launch({ args });
  } catch {
    return chromium.launch({ channel: "chrome", args });
  }
}
const browser = await launch();

const failures = [];
const skipped = [];
let passed = 0;
async function check(label, fn) {
  try {
    const result = await fn();
    if (result === "skip") return;
    passed++;
    console.log(`  ✓ ${label}`);
  } catch (error) {
    failures.push(label);
    console.error(`  ✗ ${label}\n      ${String(error?.message ?? error).split("\n").join("\n      ")}`);
  }
}
function skip(label, why) {
  skipped.push(label);
  console.log(`  - ${label} (skipped: ${why})`);
  return "skip";
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
const json = (value) => JSON.stringify(value);

const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message}`));

/** Runs act() in the page on `window[agentVar]`. `steps` use { role, name }
 * instead of refs; they're resolved through query() first, as an agent
 * would. `name` matches exactly when `exact` is set. */
function act(steps, agentVar = "kernelAgentDemo") {
  return page.evaluate(
    async ([steps, agentVar]) => {
      const agent = window[agentVar];
      const resolved = steps.map(({ role, name, exact, ...rest }) => {
        const node = agent.query({ role, name }).find((n) => !exact || n.name === name);
        if (!node) throw new Error(`no ${role} "${name ?? ""}" in snapshot:\n${window.__kernelAgent.formatSnapshot(agent.snapshot())}`);
        return { ref: node.ref, ...rest };
      });
      return agent.act({ steps: resolved, continueOnError: true });
    },
    [steps, agentVar],
  );
}
const query = (options, agentVar = "__agent") => page.evaluate(([o, v]) => window[v].query(o), [options, agentVar]);
/** Every snapshot node, context nodes (tabpanel, grid…) included. */
const allNodes = (agentVar = "__agent") =>
  page.evaluate((v) => {
    const out = [];
    const walk = (nodes) => nodes.forEach((n) => (out.push(n), walk(n.children ?? [])));
    walk(window[v].snapshot().nodes);
    return out;
  }, agentVar);
const outline = (agentVar = "__agent") => page.evaluate((v) => window.__kernelAgent.formatSnapshot(window[v].snapshot()), agentVar);

/** Loads a docs page, waits for the island under `rootSelector` to
 * hydrate, and creates `window.__agent` scoped to it. */
async function bridgeOn(path, rootSelector = ".docs-example") {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  const rootLocator = page.locator(rootSelector).first();
  await rootLocator.scrollIntoViewIfNeeded();
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    return el && !el.querySelector("astro-island[ssr]");
  }, rootSelector);
  await page.evaluate(async (sel) => {
    const kernelAgent = await import("/__agent/index.js");
    window.__kernelAgent = kernelAgent;
    window.__agent?.destroy();
    window.__agent = kernelAgent.createAgentBridge({ root: document.querySelector(sel) });
  }, rootSelector);
}

async function loadDemo(target = page) {
  await target.goto(`${base}/agent-bridge/`, { waitUntil: "networkidle" });
  await target.locator(".agent-demo").scrollIntoViewIfNeeded();
  await target.waitForFunction(() => Boolean(window.kernelAgentDemo), null, { timeout: 10000 });
  await target.evaluate(async () => {
    window.__kernelAgent = await import("/__agent/index.js");
  });
}

/** Runs the demo's sample agent run, approving the submit. */
async function runSample(target) {
  await target.getByRole("button", { name: "Run sample agent steps" }).click();
  const approval = target.locator(".agent-demo-panel [data-slot='tool-approval'][data-status='pending']");
  await approval.waitFor({ state: "visible", timeout: 8000 });
  await approval.getByRole("button", { name: "Approve" }).click();
  await target.locator(".agent-demo-status", { hasText: "Saved Ada Lovelace on the Team plan, with product updates." }).waitFor({ timeout: 5000 });
}

async function axeDemo(target) {
  // Let ToolApproval's status line finish fading in: mid-transition
  // opacity reads as low contrast.
  await target.waitForTimeout(800);
  const results = await new AxeBuilder({ page: target }).include(".docs-example").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  assert(!bad.length, bad.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`).join("\n"));
}

// ── 1. The guide's demo ──────────────────────────────────────────────
console.log("Agent bridge demo");
await loadDemo();

await check("snapshot describes the Kernel components", async () => {
  const nodes = await page.evaluate(() => window.kernelAgentDemo.query({}));
  const by = (role, name) => nodes.find((n) => n.role === role && n.name === name);
  assert(by("textbox", "Name")?.component === "TextField", `TextField not recognised: ${json(by("textbox", "Name"))}`);
  assert(by("switch", "Email me product updates")?.component === "Switch", "Switch not recognised");
  const plan = by("combobox", "Plan");
  assert(plan?.component === "Select" && plan.options?.length === 3, `Select not described: ${json(plan)}`);
  assert(by("button", "Save settings")?.component === "Button", "Button not recognised");
  assert(!nodes.some((n) => n.name === "Run sample agent steps"), "content outside root leaked into the snapshot");
});

await check("type, check and select update the React components", async () => {
  const result = await act([
    { role: "textbox", name: "Name", action: "type", args: { text: "Grace Hopper" } },
    { role: "switch", name: "Email me product updates", action: "check" },
    { role: "combobox", name: "Plan", action: "select", args: { value: "Pro" } },
  ]);
  assert(result.ok, `act failed: ${json(result.results)}`);
  const stage = page.locator(".agent-demo-stage");
  assert((await stage.getByLabel("Name", { exact: true }).inputValue()) === "Grace Hopper", "TextField value not updated");
  assert((await stage.getByRole("switch", { name: "Email me product updates" }).getAttribute("aria-checked")) === "true", "Switch not checked");
  assert((await stage.getByLabel("Plan").inputValue()) === "pro", "Select value not updated");
  const changed = Object.fromEntries(result.diff.changed.map((c) => [c.name, c.changes]));
  assert(changed["Email me product updates"]?.checked?.[1] === true, `diff missing switch change: ${json(result.diff)}`);
});

await check("press opens the Dialog and close closes it", async () => {
  let result = await act([{ role: "button", name: "Invite a teammate", action: "press" }]);
  assert(result.ok, `press failed: ${json(result.results)}`);
  const dialog = page.locator(".agent-demo-stage dialog");
  await dialog.waitFor({ state: "visible", timeout: 3000 });
  assert(await dialog.evaluate((d) => d.open), "dialog not open");
  assert(result.diff.added.some((n) => n.role === "dialog" && n.name === "Invite a teammate"), `diff missing dialog: ${json(result.diff.added)}`);
  const inside = await page.evaluate(() => window.kernelAgentDemo.query({ role: "textbox", name: "Email address" }).length);
  assert(inside === 1, "dialog content not in snapshot while open");

  result = await act([{ role: "dialog", name: "Invite a teammate", action: "close" }]);
  assert(result.ok, `close failed: ${json(result.results)}`);
  // act() waits out the Dialog's exit transition before diffing.
  assert(result.diff.removed.some((n) => n.role === "dialog"), `diff missing removed dialog: ${json(result.diff)}`);
  await page.waitForFunction(() => !document.querySelector(".agent-demo-stage dialog")?.open, null, { timeout: 3000 });
  const after = await page.evaluate(() => window.kernelAgentDemo.query({ role: "dialog" }).length);
  assert(after === 0, "closed dialog still in snapshot");
});

await check("submitting asks for approval through ToolApproval, then runs", async () => {
  const pending = act([{ role: "button", name: "Save settings", action: "press" }]);
  const approval = page.locator(".agent-demo-panel [data-slot='tool-approval']");
  await approval.waitFor({ state: "visible", timeout: 3000 });
  assert((await approval.textContent()).includes('Press "Save settings" (button)'), "approval message missing");
  await approval.getByRole("button", { name: "Approve" }).click();
  const result = await pending;
  assert(result.ok && result.results[0].confirmed === true, `submit not confirmed: ${json(result.results)}`);
  const status = await page.locator(".agent-demo-status").textContent();
  assert(status.includes("Saved Grace Hopper on the Pro plan, with product updates."), `form handler didn't run: "${status}"`);
});

await check("a declined step does not run", async () => {
  await act([{ role: "textbox", name: "Name", action: "type", args: { text: "Declined" } }]);
  const pending = act([{ role: "button", name: "Save settings", action: "press" }]);
  const approval = page.locator(".agent-demo-panel [data-slot='tool-approval'][data-status='pending']");
  await approval.waitFor({ state: "visible", timeout: 3000 });
  await approval.getByRole("button", { name: "Deny" }).click();
  const result = await pending;
  assert(!result.ok && result.results[0].confirmed === false, `declined step ran: ${json(result.results)}`);
  const status = await page.locator(".agent-demo-status").textContent();
  assert(!status.includes("Declined"), "form submitted despite denial");
});

await check("Enter in a form field needs approval too", async () => {
  const pending = act([{ role: "textbox", name: "Name", action: "key", args: { key: "Enter" } }]);
  const approval = page.locator(".agent-demo-panel [data-slot='tool-approval'][data-status='pending']");
  await approval.waitFor({ state: "visible", timeout: 3000 });
  assert((await approval.textContent()).includes('Press a key in "Name" (textbox): "Enter"'), `approval message: ${await approval.textContent()}`);
  await approval.getByRole("button", { name: "Deny" }).click();
  const result = await pending;
  assert(!result.ok && result.results[0].confirmed === false, `Enter ran without approval: ${json(result.results)}`);
});

await check("hidden and disabled targets are refused", async () => {
  const errorsSeen = await page.evaluate(async () => {
    const agent = window.kernelAgentDemo;
    const save = agent.query({ role: "button", name: "Save settings" })[0];
    const el = agent.element(save.ref);
    el.disabled = true;
    const disabled = await agent.act({ steps: [{ ref: save.ref, action: "press" }] });
    el.disabled = false;
    el.style.display = "none";
    const hidden = await agent.act({ steps: [{ ref: save.ref, action: "press" }] });
    el.style.display = "";
    return [disabled.results[0].error, hidden.results[0].error];
  });
  assert(/disabled/.test(errorsSeen[0]) && /hidden/.test(errorsSeen[1]), `unexpected errors: ${json(errorsSeen)}`);
});

await check("the sample agent run completes end to end", async () => {
  await loadDemo();
  await runSample(page);
  await page.waitForFunction(() => document.querySelector(".agent-demo-panel")?.textContent?.includes('value="Ada Lovelace"'), null, { timeout: 3000 }).catch(() => {
    throw new Error("live snapshot panel didn't update");
  });
});

await check("no serious or critical axe violations in the demo (light)", () => axeDemo(page));

await check("no serious or critical axe violations in the demo (dark)", async () => {
  const dark = await browser.newContext({ colorScheme: "dark" });
  await dark.addInitScript(() => {
    try {
      localStorage.setItem("kernel:color-scheme", "dark");
    } catch {}
  });
  const darkPage = await dark.newPage();
  try {
    await loadDemo(darkPage);
    const scheme = await darkPage.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
    assert(scheme.includes("dark"), `page didn't switch to dark (color-scheme: ${scheme})`);
    await runSample(darkPage);
    await axeDemo(darkPage);
  } finally {
    await dark.close();
  }
});

// ── 2. React components on their docs pages ──────────────────────────
console.log("React components");

await check("DropdownMenu: open, press a menuitem, menu closes; close via trigger", async () => {
  await bridgeOn("/components/dropdown-menu/");
  let result = await act([{ role: "button", name: "Actions", action: "open" }], "__agent");
  assert(result.ok, json(result.results));
  const items = result.diff.added.filter((n) => n.role === "menuitem");
  assert(items.length >= 2 && items.every((n) => n.component === "DropdownMenu" && n.ref), `menu items not added: ${json(result.diff)}`);
  assert(await page.locator(".docs-example [popover]").first().evaluate((el) => el.matches(":popover-open")), "menu popover not open");
  result = await act([{ role: "menuitem", name: items[1].name, action: "press" }], "__agent");
  assert(result.ok, json(result.results));
  assert(result.diff.removed.filter((n) => n.role === "menuitem").length === items.length, `menu items not removed: ${json(result.diff)}`);
  assert(result.diff.changed.some((c) => c.name === "Actions" && c.changes.expanded?.[1] === false), "trigger not collapsed");

  result = await act([{ role: "button", name: "Actions", action: "open" }, { role: "button", name: "Actions", action: "close" }], "__agent");
  assert(result.ok, json(result.results));
  assert(!(await query({ role: "menuitem" })).length, "menu items still in snapshot after close");
});

await check("Popover: open shows its content, close hides it", async () => {
  await bridgeOn("/components/popover/");
  const before = await query({});
  let result = await act([{ role: "button", name: "Distance", action: "open" }], "__agent");
  assert(result.ok, json(result.results));
  assert(await page.locator(".docs-example [popover]").first().evaluate((el) => el.matches(":popover-open")), "popover not open");
  const during = await query({});
  assert(during.length > before.length, `popover content not in snapshot:\n${await outline()}`);
  assert(during.find((n) => n.name === "Distance")?.expanded === true, "trigger not expanded");
  result = await act([{ role: "button", name: "Distance", action: "close" }], "__agent");
  assert(result.ok, json(result.results));
  assert(!(await page.locator(".docs-example [popover]").first().evaluate((el) => el.matches(":popover-open"))), "popover still open");
  assert((await query({})).length === before.length, `popover content left in snapshot:\n${await outline()}`);
});

await check("Select (base-select): select by label fires change; open explains itself; works with the picker open", async () => {
  await bridgeOn("/components/select/");
  const select = page.locator(".docs-example select").first();
  assert((await select.evaluate((el) => getComputedStyle(el).appearance)) === "base-select", "not a base-select in this browser");
  await select.evaluate((el) => {
    window.__changes = [];
    el.addEventListener("change", () => window.__changes.push(el.value));
  });
  let result = await act([{ role: "combobox", name: "Country", action: "select", args: { value: "Japan" } }], "__agent");
  assert(result.ok && (await select.inputValue()) === "jp", `select failed: ${json(result.results)}`);
  assert(json(await page.evaluate(() => window.__changes)) === json(["jp"]), "change not fired once");
  result = await act([{ role: "combobox", name: "Country", action: "open" }], "__agent");
  assert(/choose an option with "select"/.test(result.results[0].error ?? ""), `open on a select: ${json(result.results)}`);

  // A person opened the picker; the agent then chooses.
  await select.click();
  await page.waitForFunction(() => document.querySelector(".docs-example select").matches(":open"), null, { timeout: 2000 });
  result = await act([{ role: "combobox", name: "Country", action: "select", args: { value: "Germany" } }], "__agent");
  assert(result.ok && (await select.inputValue()) === "de", `select with picker open failed: ${json(result.results)}`);
  assert(!(await select.evaluate((el) => el.matches(":open"))), "picker left open after the agent chose");
});

await check("Combobox: select from closed (opens, presses the option), and open lists options", async () => {
  await bridgeOn("/components/combobox/");
  let result = await act([{ role: "combobox", name: "Framework", action: "select", args: { value: "SvelteKit" } }], "__agent");
  assert(result.ok, json(result.results));
  const input = page.locator(".docs-example [role='combobox']").first();
  assert((await input.inputValue()) === "SvelteKit", `value: ${await input.inputValue()}`);
  assert(result.diff.changed.some((c) => c.changes.value?.[1] === "SvelteKit"), `diff: ${json(result.diff)}`);
  assert(!(await query({ role: "option" })).length, "listbox left open");

  // The input is focused and holds "SvelteKit" now, so a click alone
  // wouldn't open it (it opens on focus) and the list filters to one match:
  // clear, then open falls back to ArrowDown.
  result = await act([{ role: "combobox", name: "Framework", action: "close" }, { role: "combobox", name: "Framework", action: "open" }], "__agent");
  assert(result.ok, json(result.results));
  result = await act([{ role: "combobox", name: "Framework", action: "clear" }, { role: "combobox", name: "Framework", action: "open" }], "__agent");
  const options = await query({ role: "option" });
  assert(result.ok && options.length >= 3 && options.every((o) => o.component === "Combobox"), `options not listed: ${json(result)}`);
  result = await act([{ role: "option", name: "Nuxt", action: "press" }], "__agent");
  assert(result.ok && (await input.inputValue()) === "Nuxt", `pressing an option: ${json(result.results)}`);
  result = await act([{ role: "combobox", name: "Framework", action: "select", args: { value: "Gatsby" } }], "__agent");
  assert(!result.ok && /No option "Gatsby"/.test(result.results[0].error), `missing option: ${json(result.results)}`);
});

await check("Tooltip: shown tooltip is a description, never actionable", async () => {
  await bridgeOn("/components/tooltip/");
  const result = await act([{ role: "button", name: "Share", action: "focus" }], "__agent");
  assert(result.ok, json(result.results));
  await page.locator(".docs-example [role='tooltip']").first().waitFor({ state: "visible", timeout: 3000 });
  const nodes = await query({}, "__agent");
  const all = await allNodes();
  assert(!all.some((n) => n.role === "tooltip"), `tooltip in snapshot: ${json(all)}`);
  assert(nodes.length === 1 && nodes[0].description === "Copies the current URL", `nodes: ${json(nodes)}`);
});

await check("Tabs: press switches the selected tab and the panel", async () => {
  await bridgeOn("/components/tabs/");
  const result = await act([{ role: "tab", name: "Activity", action: "press" }], "__agent");
  assert(result.ok, json(result.results));
  const tabs = await query({ role: "tab" });
  assert(tabs.find((t) => t.name === "Activity")?.selected === true && tabs.find((t) => t.name === "Overview")?.selected === false, `tabs: ${json(tabs)}`);
  const panels = (await allNodes()).filter((n) => n.role === "tabpanel");
  assert(panels.length === 1 && panels[0].name === "Activity", `panels: ${json(panels)}`);
});

await check("Accordion (<details name>): open, close and toggle; opening one closes its sibling", async () => {
  await bridgeOn("/components/accordion/");
  const first = "Why real semantic elements?";
  const second = "Does this work without JavaScript?";
  const expanded = async () => Object.fromEntries((await query({ role: "button" })).map((n) => [n.name, n.expanded]));
  let result = await act([{ role: "button", name: second, action: "open" }], "__agent");
  assert(result.ok, json(result.results));
  let state = await expanded();
  assert(state[second] === true && state[first] === false, `exclusive accordion: ${json(state)}`);
  result = await act([{ role: "button", name: second, action: "close" }, { role: "button", name: first, action: "toggle" }], "__agent");
  state = await expanded();
  assert(result.ok && state[second] === false && state[first] === true, `${json(result.results)} ${json(state)}`);
  result = await act([{ role: "button", name: first, action: "open" }], "__agent");
  assert(result.results[0].note === "already open", json(result.results));
});

await check("Slider: setValue moves the range, snaps to step, refuses out of range", async () => {
  await bridgeOn("/components/slider/");
  const input = page.locator(".docs-example input[type='range']").first();
  let result = await act([{ role: "slider", name: "Volume", action: "setValue", args: { value: 75 } }], "__agent");
  assert(result.ok && (await input.inputValue()) === "75", `setValue: ${json(result.results)} value=${await input.inputValue()}`);
  assert(result.diff.changed.some((c) => c.name === "Volume" && c.changes.value?.[1] === "75"), `diff: ${json(result.diff)}`);
  // The React component's own state followed (its value readout re-renders).
  const readout = await page.locator(".docs-example").first().textContent();
  assert(readout.includes("75"), `React state didn't follow: ${readout}`);
  await input.evaluate((el) => el.setAttribute("step", "5"));
  result = await act([{ role: "slider", name: "Volume", action: "setValue", args: { value: 63 } }], "__agent");
  assert(result.ok && (await input.inputValue()) === "65" && result.results[0].note === "set to 65", `snap: ${json(result.results)}`);
  result = await act([{ role: "slider", name: "Volume", action: "setValue", args: { value: 140 } }], "__agent");
  assert(result.results[0].error === "140 is above the maximum (100).", json(result.results));
  result = await act([{ role: "slider", name: "Volume", action: "type", args: { text: "10" } }], "__agent");
  assert(/use "setValue"/.test(result.results[0].error), json(result.results));
});

await check("NumberField: setValue, the increment button, and bounds", async () => {
  await bridgeOn("/components/number-field/");
  const input = page.locator(".docs-example input[type='number']").first();
  let result = await act([{ role: "spinbutton", name: "Quantity", action: "setValue", args: { value: 4 } }, { role: "button", name: "Increment", action: "press" }], "__agent");
  assert(result.ok && (await input.inputValue()) === "5", `${json(result.results)} value=${await input.inputValue()}`);
  result = await act([{ role: "spinbutton", name: "Quantity", action: "setValue", args: { value: 50 } }], "__agent");
  assert(result.results[0].error === "50 is above the maximum (10)." && (await input.inputValue()) === "5", json(result.results));
});

await check("TagInput: type then key Enter commits a tag", async () => {
  await bridgeOn("/components/tag-input/");
  const field = (await query({ role: "textbox" }))[0];
  assert(field?.name === "Skills" && field.component === "TagInput", `TagInput field missing from snapshot:\n${await outline()}`);
  const result = await act([{ role: "textbox", name: "Skills", action: "type", args: { text: "Rust" } }, { role: "textbox", name: "Skills", action: "key", args: { key: "Enter" } }], "__agent");
  assert(result.ok, json(result.results));
  assert(result.diff.added.some((n) => n.name === "Remove Rust"), `diff: ${json(result.diff)}`);
  assert((await page.locator(".docs-example [data-tag='Rust']").count()) === 1, "tag not rendered");
  assert((await query({ role: "textbox", name: "Skills" }))[0].value === "", "field not cleared after commit");
});

await check("DatePicker: pressing a day selects it; the cell doesn't get a second ref", async () => {
  await bridgeOn("/components/date-picker/");
  const all = await allNodes();
  assert(!all.some((n) => n.role === "gridcell" && n.ref), `gridcells still carry refs: ${json(all.filter((n) => n.role === "gridcell").slice(0, 3))}`);
  const caption = page.locator(".docs-example p").first();
  const before = await caption.textContent();
  const result = await act([{ role: "button", name: "14", exact: true, action: "press" }], "__agent");
  assert(result.ok, json(result.results));
  assert(result.diff.changed.some((c) => c.name === "14" && c.changes.selected?.[1] === true), `diff: ${json(result.diff)}`);
  const after = await caption.textContent();
  assert(after !== before && /14/.test(after), `selection not shown: "${before}" → "${after}"`);
});

// ── 3. Custom Elements ───────────────────────────────────────────────
console.log("Custom Elements (@kernelui-lib/elements)");

await check("elements lab: Kernel's custom elements use light DOM (no shadow roots)", async () => {
  await bridgeOn("/labs/elements/", "main");
  const shadowed = await page.evaluate(() => [...document.querySelectorAll("*")].filter((el) => el.tagName.startsWith("KERNEL-") && el.shadowRoot).map((el) => el.tagName));
  assert(!shadowed.length, `kernel elements with shadow roots: ${shadowed.join(", ")}`);
});

await check("kernel-switch, kernel-select and kernel-tabs: component detection and act", async () => {
  const sw = (await query({ role: "switch", name: "Enable notifications" }))[0];
  const plan = (await query({ role: "combobox", name: "Plan" }))[0];
  const tab = (await query({ role: "tab", name: "Two" }))[0];
  assert(sw?.component === "Switch" && plan?.component === "Select" && tab?.component === "Tabs", `detection: ${json([sw, plan, tab])}`);
  const result = await act(
    [
      { role: "switch", name: "Enable notifications", action: "uncheck" },
      { role: "combobox", name: "Plan", action: "select", args: { value: "Pro" } },
      { role: "tab", name: "Two", action: "press" },
    ],
    "__agent",
  );
  assert(result.ok, json(result.results));
  assert((await page.locator("kernel-switch").first().evaluate((el) => el.querySelector("[role='switch']").getAttribute("aria-checked"))) === "false", "kernel-switch not unchecked");
  assert((await page.locator("#lab-select select").inputValue()) === "pro", "kernel-select value not changed");
  const tabs = await query({ role: "tab", name: "Two" });
  assert(tabs[0].selected === true, `tab not selected: ${json(tabs)}`);
});

await check("kernel-dialog: press its opener, then close it", async () => {
  let result = await act([{ role: "button", name: "Open dialog", action: "press" }], "__agent");
  assert(result.ok, json(result.results));
  const dialog = result.diff.added.find((n) => n.role === "dialog");
  assert(dialog?.name === "Lab dialog" && dialog.component === "Dialog", `dialog not added: ${json(result.diff.added)}`);
  result = await act([{ role: "dialog", name: "Lab dialog", action: "close" }], "__agent");
  assert(result.ok, json(result.results));
  await page.waitForFunction(() => !document.querySelector("#lab-dialog dialog")?.open, null, { timeout: 3000 });
  assert(!(await query({ role: "dialog" })).length, "dialog still in snapshot");
});

await check("kernel-dropdown-menu: open, items are DropdownMenu, press closes", async () => {
  let result = await act([{ role: "button", name: "Menu", exact: true, action: "open" }], "__agent");
  assert(result.ok, json(result.results));
  const items = result.diff.added.filter((n) => n.role === "menuitem");
  assert(items.map((n) => n.name).join(",") === "Edit,Duplicate,Delete" && items.every((n) => n.component === "DropdownMenu"), `items: ${json(result.diff.added)}`);
  result = await act([{ role: "menuitem", name: "Duplicate", action: "press" }], "__agent");
  assert(result.ok && !(await query({ role: "menuitem", name: "Duplicate" })).length, `menu not closed: ${json(result)}`);
});

await check("an open shadow root (third-party element) is traversed, operable and covered by host markers", async () => {
  await page.evaluate(() => {
    class AgentShadowProbe extends HTMLElement {
      constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open" });
        shadow.innerHTML = `<fieldset><legend>Shadow probe</legend><label for="f">Shadow nickname</label><input id="f" /><slot></slot></fieldset>`;
      }
    }
    if (!customElements.get("agent-shadow-probe")) customElements.define("agent-shadow-probe", AgentShadowProbe);
    const host = document.createElement("agent-shadow-probe");
    host.id = "agent-shadow-probe";
    host.innerHTML = `<kernel-switch>Slotted switch</kernel-switch>`;
    document.querySelector("main").prepend(host);
  });
  await page.waitForTimeout(50);
  const text = await outline();
  assert(/- group "Shadow probe"\n {2}- textbox "Shadow nickname" \[ref=e\d+\] value=""\n {2}- switch "Slotted switch" \[ref=e\d+\] checked=false \(Switch\)/.test(text), `flat tree not in snapshot:\n${text.split("\n").slice(0, 8).join("\n")}`);
  let result = await act([{ role: "textbox", name: "Shadow nickname", action: "type", args: { text: "Ada" } }, { role: "switch", name: "Slotted switch", action: "check" }], "__agent");
  assert(result.ok, json(result.results));
  assert((await page.evaluate(() => document.getElementById("agent-shadow-probe").shadowRoot.getElementById("f").value)) === "Ada", "shadow input not typed into");
  await page.evaluate(() => document.getElementById("agent-shadow-probe").setAttribute("data-kernel-agent-redact", ""));
  const redacted = (await query({ role: "textbox", name: "Shadow nickname" }))[0];
  assert(redacted.value === "[redacted]", `host redaction didn't reach the shadow input: ${json(redacted)}`);
  await page.evaluate(() => document.getElementById("agent-shadow-probe").setAttribute("data-kernel-agent-confirm", ""));
  result = await page.evaluate(async () => {
    const agent = window.__kernelAgent.createAgentBridge({ root: document.querySelector("main"), confirm: () => false });
    const ref = agent.query({ role: "textbox", name: "Shadow nickname" })[0].ref;
    return agent.act({ steps: [{ ref, action: "clear" }] });
  });
  assert(!result.ok && result.results[0].confirmed === false, `host confirm marker didn't gate the shadow input: ${json(result.results)}`);
  await page.evaluate(() => document.getElementById("agent-shadow-probe").remove());
});

// ── 4. WebMCP ────────────────────────────────────────────────────────
console.log("WebMCP");

/** A mock of the WebMCP draft (webmachinelearning.github.io/webmcp):
 * `document.modelContext.registerTool(tool, { signal })` returning a
 * promise, InvalidStateError for duplicate or invalid names and empty
 * descriptions, TypeError for a non-object inputSchema, the signal's reason
 * when already aborted, removal on abort, and `executeTool()` calling
 * `execute(input, { signal })` and serialising the result. It also
 * validates each call's input against the tool's inputSchema, so the
 * realistic inputs below prove the schemas describe what the tools take. */
function installWebMcpMock() {
  const registry = new Map();
  const log = [];
  const fail = (name, message) => Promise.reject(new DOMException(message, name));
  const typeOf = (v) => (Array.isArray(v) ? "array" : v === null ? "null" : Number.isInteger(v) ? "integer" : typeof v);
  function validate(schema, value, path = "input") {
    if (!schema || typeof schema !== "object") return [];
    const errors = [];
    const types = schema.type ? [].concat(schema.type) : null;
    const actual = typeOf(value);
    if (types && !types.includes(actual) && !(actual === "integer" && types.includes("number"))) return [`${path}: expected ${types.join("|")}, got ${actual}`];
    if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: ${JSON.stringify(value)} not in ${JSON.stringify(schema.enum)}`);
    if (actual === "object") {
      for (const key of schema.required ?? []) if (!(key in value)) errors.push(`${path}.${key}: required`);
      for (const [key, v] of Object.entries(value)) {
        if (schema.properties?.[key]) errors.push(...validate(schema.properties[key], v, `${path}.${key}`));
        else if (schema.additionalProperties === false) errors.push(`${path}.${key}: not allowed`);
      }
    }
    if (actual === "array") {
      if (schema.minItems && value.length < schema.minItems) errors.push(`${path}: fewer than ${schema.minItems} items`);
      value.forEach((item, i) => errors.push(...validate(schema.items, item, `${path}[${i}]`)));
    }
    return errors;
  }
  const modelContext = {
    registerTool(tool, options = {}) {
      if (tool.inputSchema !== undefined && (typeof tool.inputSchema !== "object" || tool.inputSchema === null)) throw new TypeError("inputSchema must be an object");
      const { signal } = options;
      if (signal?.aborted) return Promise.reject(signal.reason);
      if (typeof tool.name !== "string" || !/^[A-Za-z0-9_.-]{1,128}$/.test(tool.name)) return fail("InvalidStateError", `invalid tool name "${tool.name}"`);
      if (!tool.description) return fail("InvalidStateError", "empty description");
      if (typeof tool.execute !== "function") return Promise.reject(new TypeError("execute is required"));
      if (registry.has(tool.name)) return fail("InvalidStateError", `duplicate tool "${tool.name}"`);
      try {
        JSON.stringify(tool.inputSchema ?? {});
      } catch (error) {
        return Promise.reject(error);
      }
      registry.set(tool.name, tool);
      log.push(`register ${tool.name}`);
      signal?.addEventListener("abort", () => {
        if (registry.get(tool.name) === tool) registry.delete(tool.name);
        log.push(`unregister ${tool.name}`);
      });
      return Promise.resolve(undefined);
    },
    async getTools() {
      return [...registry.values()].map(({ name, title = "", description, inputSchema, annotations = {} }) => ({
        name,
        title,
        description,
        inputSchema,
        annotations: { readOnlyHint: false, untrustedContentHint: false, consequentialHint: false, debugging: false, ...annotations },
      }));
    },
    async executeTool(tool, input = {}, options = {}) {
      const registered = registry.get(tool.name);
      if (!registered) throw new DOMException(`no tool "${tool.name}"`, "NotFoundError");
      const errors = validate(registered.inputSchema, input);
      if (errors.length) throw new TypeError(`input doesn't match ${tool.name}'s inputSchema: ${errors.join("; ")}`);
      const signal = options.signal ?? new AbortController().signal;
      return JSON.stringify(await registered.execute(input, { signal }));
    },
  };
  Object.defineProperty(Document.prototype, "modelContext", { configurable: true, get: () => modelContext });
  window.__webmcpLog = log;
}

/** Calls every tool from page context with realistic input and checks the
 * output and the UI. Shared by the mock and the real WebMCP run. The demo
 * registers its tools with registerTools: true (prefix "kernel"). */
async function exerciseTools(target) {
  const run = (name, input) =>
    target.evaluate(
      async ([name, input]) => {
        const mc = document.modelContext;
        const tool = (await mc.getTools()).find((t) => t.name === name);
        if (!tool) throw new Error(`tool ${name} not registered`);
        const raw = await mc.executeTool(tool, input);
        return JSON.parse(raw);
      },
      [name, input],
    );
  const text = (result) => {
    assert(result?.content?.[0]?.type === "text", `not a text result: ${json(result)}`);
    return result.content[0].text;
  };
  const tools = await target.evaluate(async () => (await document.modelContext.getTools()).map((t) => ({ name: t.name, annotations: t.annotations })));
  const names = tools.map((t) => t.name).sort();
  assert(json(names) === json(["kernel_act", "kernel_query", "kernel_snapshot"]), `tools: ${json(names)}`);
  const ann = Object.fromEntries(tools.map((t) => [t.name, t.annotations]));
  assert(ann.kernel_snapshot.readOnlyHint === true && ann.kernel_snapshot.untrustedContentHint === true, `snapshot annotations: ${json(ann.kernel_snapshot)}`);
  assert(ann.kernel_act.readOnlyHint === false, `act annotations: ${json(ann.kernel_act)}`);

  const outlineText = text(await run("kernel_snapshot", {}));
  assert(/- textbox "Name" \[ref=e\d+\] value="" \(TextField\)/.test(outlineText), `snapshot text:\n${outlineText}`);
  assert(!outlineText.includes("Run sample agent steps"), "snapshot leaked the panel outside root");
  const full = JSON.parse(text(await run("kernel_snapshot", { format: "json" })));
  assert(Array.isArray(full.nodes) && full.refs > 0, `json snapshot: ${json(full).slice(0, 200)}`);

  const [field] = JSON.parse(text(await run("kernel_query", { role: "textbox", name: "name" })));
  const [sw] = JSON.parse(text(await run("kernel_query", { component: "Switch" })));
  const [plan] = JSON.parse(text(await run("kernel_query", { role: "combobox", text: "Free" })));
  assert(field?.name === "Name" && sw?.role === "switch" && plan?.name === "Plan", `query results: ${json([field, sw, plan])}`);

  const acted = JSON.parse(
    text(
      await run("kernel_act", {
        steps: [
          { ref: field.ref, action: "type", args: { text: "Katherine Johnson" } },
          { ref: sw.ref, action: "toggle" },
          { ref: plan.ref, action: "select", args: { value: "team" } },
        ],
      }),
    ),
  );
  assert(acted.ok && acted.results.length === 3, `act: ${json(acted.results)}`);
  assert(acted.diff.changed.some((c) => c.name === "Name" && c.changes.value?.[1] === "Katherine Johnson"), `act diff: ${json(acted.diff)}`);
  const stage = target.locator(".agent-demo-stage");
  assert((await stage.getByLabel("Name", { exact: true }).inputValue()) === "Katherine Johnson", "tool's type didn't reach the TextField");
  assert((await stage.getByLabel("Plan").inputValue()) === "team", "tool's select didn't reach the Select");

  // A step that needs a person: the tool call waits on ToolApproval.
  const [save] = JSON.parse(text(await run("kernel_query", { role: "button", name: "Save settings" })));
  const pending = run("kernel_act", { steps: [{ ref: save.ref, action: "press" }] });
  const approval = target.locator(".agent-demo-panel [data-slot='tool-approval'][data-status='pending']");
  await approval.waitFor({ state: "visible", timeout: 3000 });
  await approval.getByRole("button", { name: "Approve" }).click();
  const submitted = JSON.parse(text(await pending));
  assert(submitted.ok && submitted.results[0].confirmed === true, `approved submit: ${json(submitted.results)}`);
  await target.locator(".agent-demo-status", { hasText: "Saved Katherine Johnson on the Team plan, with product updates." }).waitFor({ timeout: 3000 });

  // A bad ref comes back as a step error, not a thrown tool call.
  const stale = JSON.parse(text(await run("kernel_act", { steps: [{ ref: "e9999", action: "press" }] })));
  assert(!stale.ok && /Take a fresh snapshot/.test(stale.results[0].error), `stale ref: ${json(stale)}`);

  // destroy() aborts the registration signal: the tools go away.
  await target.evaluate(() => window.kernelAgentDemo.destroy());
  await target.waitForFunction(async () => (await document.modelContext.getTools()).every((t) => !t.name.startsWith("kernel_")), null, { timeout: 2000 });
}

await check("mock WebMCP: tools register, execute with realistic input, and unregister on abort", async () => {
  const mockContext = await browser.newContext();
  await mockContext.addInitScript(installWebMcpMock);
  const mockPage = await mockContext.newPage();
  mockPage.on("pageerror", (error) => errors.push(`mock: ${error.message}`));
  try {
    await loadDemo(mockPage);
    assert(await mockPage.evaluate(() => window.__kernelAgent.isWebMcpAvailable()), "isWebMcpAvailable() false with the mock installed");
    await exerciseTools(mockPage);
    const log = await mockPage.evaluate(() => window.__webmcpLog);
    for (const name of ["kernel_snapshot", "kernel_query", "kernel_act"]) {
      assert(log.includes(`register ${name}`) && log.includes(`unregister ${name}`), `log: ${json(log)}`);
    }
    // A second bridge with the same prefix is refused by the registry
    // (duplicate names), warns instead of throwing, and its unregister is safe.
    const dup = await mockPage.evaluate(async () => {
      const { createAgentBridge } = window.__kernelAgent;
      const a = createAgentBridge({ root: document.querySelector(".agent-demo-stage") });
      const b = createAgentBridge({ root: document.querySelector(".agent-demo-stage") });
      const warnings = [];
      const warn = console.warn;
      console.warn = (...args) => warnings.push(String(args[0]));
      const stopA = a.registerTools({ prefix: "app" });
      const stopB = b.registerTools({ prefix: "app" });
      await new Promise((r) => setTimeout(r, 20));
      console.warn = warn;
      const during = (await document.modelContext.getTools()).map((t) => t.name);
      stopB();
      const afterB = (await document.modelContext.getTools()).map((t) => t.name);
      stopA();
      stopA();
      const afterA = (await document.modelContext.getTools()).map((t) => t.name);
      return { warnings: warnings.length, during, afterB, afterA };
    });
    assert(dup.warnings === 3 && dup.during.length === 3, `duplicate registration: ${json(dup)}`);
    assert(dup.afterB.length === 3 && dup.afterA.length === 0, `aborting the refused bridge removed the other's tools: ${json(dup)}`);
  } finally {
    await mockContext.close();
  }
});

await check("real WebMCP (installed Chrome, --enable-features=WebMCP)", async () => {
  let real;
  try {
    real = await chromium.launch({ channel: "chrome", args: ["--enable-features=WebMCP"] });
  } catch (error) {
    return skip("real WebMCP", `no installed Chrome (${String(error.message).split("\n")[0]})`);
  }
  try {
    const realPage = await real.newPage();
    realPage.on("pageerror", (error) => errors.push(`real WebMCP: ${error.message}`));
    await realPage.goto(`${base}/agent-bridge/`, { waitUntil: "networkidle" });
    const available = await realPage.evaluate(() => typeof document.modelContext?.registerTool === "function" && typeof document.modelContext?.executeTool === "function");
    if (!available) return skip("real WebMCP", `${await real.version()} has no document.modelContext with this flag`);
    await loadDemo(realPage);
    await exerciseTools(realPage);
    console.log(`      (Chrome ${await real.version()})`);
  } finally {
    await real.close();
  }
});

await check("no uncaught page errors", async () => {
  assert(!errors.length, errors.join("\n"));
});

await browser.close();
server.close();

if (failures.length) {
  console.error(`\ncheck-agent-bridge: ${failures.length} failed, ${passed} passed${skipped.length ? `, ${skipped.length} skipped` : ""}.`);
  process.exit(1);
}
console.log(`check-agent-bridge: all ${passed} checks passed${skipped.length ? ` (${skipped.length} skipped: ${skipped.join(", ")})` : ""}.`);
