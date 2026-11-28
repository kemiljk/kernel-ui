#!/usr/bin/env node
/**
 * Browser check for @kernelui-lib/agent against real Kernel React
 * components: serves the built docs (apps/docs/dist), opens the agent
 * bridge guide, and drives its demo with real act() steps. It asserts that
 * the UI actually changed (React state included), not only that act()
 * reported success:
 *
 *   - TextField: `type` updates the controlled value
 *   - Switch: `check` flips aria-checked
 *   - Select: `select` by label changes the native value
 *   - Dialog: `press` its trigger opens the <dialog>, `close` closes it
 *   - Submit: needs confirmation; ToolApproval appears, Approve runs it,
 *     and the form's own submit handler renders the saved state
 *   - Hidden and disabled targets are refused
 *   - the "Run sample agent steps" button runs end to end
 *   - axe finds no serious/critical violations in the demo
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
if (!existsSync(join(dist, "agent-bridge", "index.html"))) {
  console.error("check-agent-bridge: apps/docs/dist/agent-bridge not found. Run `bun run docs:build` first.");
  process.exit(1);
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ico": "image/x-icon", ".txt": "text/plain", ".md": "text/markdown" };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join(dist, path);
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

let browser;
try {
  browser = await chromium.launch();
} catch {
  browser = await chromium.launch({ channel: "chrome" });
}

const failures = [];
let passed = 0;
async function check(label, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${label}`);
  } catch (error) {
    failures.push(label);
    console.error(`  ✗ ${label}\n      ${String(error?.message ?? error).split("\n").join("\n      ")}`);
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

async function load() {
  await page.goto(`${base}/agent-bridge/`, { waitUntil: "networkidle" });
  const demo = page.locator(".agent-demo");
  await demo.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Boolean(window.kernelAgentDemo), null, { timeout: 10000 });
}

/** Runs act() in the page. `steps` use { role, name } instead of refs; they
 * are resolved through query() first, as an agent would. */
function act(steps) {
  return page.evaluate(async (steps) => {
    const agent = window.kernelAgentDemo;
    const resolved = steps.map(({ role, name, ...rest }) => {
      const node = agent.query({ role, name })[0];
      if (!node) throw new Error(`no ${role} "${name ?? ""}" in snapshot`);
      return { ref: node.ref, ...rest };
    });
    return agent.act({ steps: resolved, continueOnError: true });
  }, steps);
}

await load();

await check("snapshot describes the Kernel components", async () => {
  const nodes = await page.evaluate(() => window.kernelAgentDemo.query({}));
  const by = (role, name) => nodes.find((n) => n.role === role && n.name === name);
  assert(by("textbox", "Name")?.component === "TextField", `TextField not recognised: ${JSON.stringify(by("textbox", "Name"))}`);
  assert(by("switch", "Email me product updates")?.component === "Switch", "Switch not recognised");
  const plan = by("combobox", "Plan");
  assert(plan?.component === "Select" && plan.options?.length === 3, `Select not described: ${JSON.stringify(plan)}`);
  assert(by("button", "Save settings")?.component === "Button", "Button not recognised");
  assert(!nodes.some((n) => n.name === "Run sample agent steps"), "content outside root leaked into the snapshot");
});

await check("type, check and select update the React components", async () => {
  const result = await act([
    { role: "textbox", name: "Name", action: "type", args: { text: "Grace Hopper" } },
    { role: "switch", name: "Email me product updates", action: "check" },
    { role: "combobox", name: "Plan", action: "select", args: { value: "Pro" } },
  ]);
  assert(result.ok, `act failed: ${JSON.stringify(result.results)}`);
  const stage = page.locator(".agent-demo-stage");
  assert((await stage.getByLabel("Name", { exact: true }).inputValue()) === "Grace Hopper", "TextField value not updated");
  assert((await stage.getByRole("switch", { name: "Email me product updates" }).getAttribute("aria-checked")) === "true", "Switch not checked");
  assert((await stage.getByLabel("Plan").inputValue()) === "pro", "Select value not updated");
  const changed = Object.fromEntries(result.diff.changed.map((c) => [c.name, c.changes]));
  assert(changed["Email me product updates"]?.checked?.[1] === true, `diff missing switch change: ${JSON.stringify(result.diff)}`);
});

await check("press opens the Dialog and close closes it", async () => {
  let result = await act([{ role: "button", name: "Invite a teammate", action: "press" }]);
  assert(result.ok, `press failed: ${JSON.stringify(result.results)}`);
  const dialog = page.locator(".agent-demo-stage dialog");
  await dialog.waitFor({ state: "visible", timeout: 3000 });
  assert(await dialog.evaluate((d) => d.open), "dialog not open");
  assert(result.diff.added.some((n) => n.role === "dialog" && n.name === "Invite a teammate"), `diff missing dialog: ${JSON.stringify(result.diff.added)}`);
  const inside = await page.evaluate(() => window.kernelAgentDemo.query({ role: "textbox", name: "Email address" }).length);
  assert(inside === 1, "dialog content not in snapshot while open");

  result = await act([{ role: "dialog", name: "Invite a teammate", action: "close" }]);
  assert(result.ok, `close failed: ${JSON.stringify(result.results)}`);
  // act() waits out the Dialog's exit transition before diffing.
  assert(result.diff.removed.some((n) => n.role === "dialog"), `diff missing removed dialog: ${JSON.stringify(result.diff)}`);
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
  assert(result.ok && result.results[0].confirmed === true, `submit not confirmed: ${JSON.stringify(result.results)}`);
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
  assert(!result.ok && result.results[0].confirmed === false, `declined step ran: ${JSON.stringify(result.results)}`);
  const status = await page.locator(".agent-demo-status").textContent();
  assert(!status.includes("Declined"), "form submitted despite denial");
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
  assert(/disabled/.test(errorsSeen[0]) && /hidden/.test(errorsSeen[1]), `unexpected errors: ${JSON.stringify(errorsSeen)}`);
});

await check("the sample agent run completes end to end", async () => {
  await load();
  await page.getByRole("button", { name: "Run sample agent steps" }).click();
  const approval = page.locator(".agent-demo-panel [data-slot='tool-approval'][data-status='pending']");
  await approval.waitFor({ state: "visible", timeout: 8000 });
  await approval.getByRole("button", { name: "Approve" }).click();
  await page.locator(".agent-demo-status", { hasText: "Saved Ada Lovelace on the Team plan, with product updates." }).waitFor({ timeout: 5000 });
  await page.waitForFunction(() => document.querySelector(".agent-demo-panel")?.textContent?.includes('value="Ada Lovelace"'), null, { timeout: 3000 }).catch(() => {
    throw new Error("live snapshot panel didn't update");
  });
});

await check("no serious or critical axe violations in the demo", async () => {
  // Let ToolApproval's status line finish fading in: mid-transition
  // opacity reads as low contrast.
  await page.waitForTimeout(800);
  const results = await new AxeBuilder({ page }).include(".docs-example").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  assert(!bad.length, bad.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`).join("\n"));
});

await check("no uncaught page errors", async () => {
  assert(!errors.length, errors.join("\n"));
});

await browser.close();
server.close();

if (failures.length) {
  console.error(`\ncheck-agent-bridge: ${failures.length} failed, ${passed} passed.`);
  process.exit(1);
}
console.log(`check-agent-bridge: all ${passed} checks passed.`);
