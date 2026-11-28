import { afterEach, describe, expect, it, vi } from "vitest";
import {
  REDACTED,
  accessibleName,
  createAgentBridge,
  formatSnapshot,
  isWebMcpAvailable,
  type AgentBridge,
  type SnapshotNode,
} from "../src/index.js";

function mount(html: string): HTMLElement {
  document.body.innerHTML = `<main id="app">${html}</main>`;
  return document.getElementById("app")!;
}

function find(bridge: AgentBridge, role: string, name: string): SnapshotNode {
  const node = bridge.query({ role, name })[0];
  if (!node) throw new Error(`no ${role} "${name}" in:\n${formatSnapshot(bridge.snapshot())}`);
  return node;
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("accessible names", () => {
  it("follows aria-labelledby, aria-label, label[for], wrapping label, alt, title and content", () => {
    mount(`
      <span id="first">Billing</span><span id="second">email</span>
      <input id="a" aria-labelledby="first second" />
      <input id="b" aria-label="Search the docs" />
      <label for="c">Full name</label><input id="c" />
      <label>Company <input id="d" /></label>
      <img id="e" alt="Kernel logo" src="x.png" />
      <button id="f" title="Settings"><svg aria-hidden="true"></svg></button>
      <button id="g">Save <span aria-hidden="true">→</span> <img alt="draft" src="y.png" /></button>
      <input id="h" type="submit" value="Send" />
      <fieldset id="i"><legend>Shipping</legend></fieldset>
      <input id="j" placeholder="you@example.com" />
    `);
    const name = (id: string) => accessibleName(document.getElementById(id)!);
    expect(name("a")).toBe("Billing email");
    expect(name("b")).toBe("Search the docs");
    expect(name("c")).toBe("Full name");
    expect(name("d")).toBe("Company");
    expect(name("e")).toBe("Kernel logo");
    expect(name("f")).toBe("Settings");
    expect(name("g")).toBe("Save draft");
    expect(name("h")).toBe("Send");
    expect(name("i")).toBe("Shipping");
    expect(name("j")).toBe("you@example.com");
  });

  it("reads hidden aria-labelledby targets but skips hidden content", () => {
    mount(`
      <span id="hidden-label" hidden>Delete project</span>
      <button id="a" aria-labelledby="hidden-label">x</button>
      <button id="b">Open <span style="display:none">secret</span>menu</button>
    `);
    expect(accessibleName(document.getElementById("a")!)).toBe("Delete project");
    expect(accessibleName(document.getElementById("b")!)).toBe("Open menu");
  });
});

describe("snapshot", () => {
  it("describes roles, values, states, options and Kernel components", () => {
    const root = mount(`
      <h2>Account</h2>
      <form aria-label="Profile">
        <div class="kernel-TextField-root">
          <label for="name">Name</label>
          <input id="name" class="kernel-TextField-input" value="Ada" required aria-describedby="name-hint" />
          <p id="name-hint">As it appears on invoices</p>
        </div>
        <label class="kernel-Switch-root"><button type="button" role="switch" aria-checked="false" class="kernel-Switch-control">Email me</button></label>
        <label for="plan">Plan</label>
        <select id="plan" class="kernel-Select-select"><option value="free">Free</option><option value="pro" selected>Pro</option></select>
        <input type="checkbox" id="terms" disabled /><label for="terms">Accept terms</label>
        <button type="submit">Save</button>
      </form>
    `);
    const bridge = createAgentBridge({ root });
    const snap = bridge.snapshot();
    const outline = formatSnapshot(snap);
    expect(outline).toContain('- heading "Account" [level=2]');
    expect(outline).toContain('- form "Profile" [ref=');

    const name = find(bridge, "textbox", "Name");
    expect(name).toMatchObject({ value: "Ada", required: true, component: "TextField", description: "As it appears on invoices" });
    expect(find(bridge, "switch", "Email me")).toMatchObject({ checked: false, component: "Switch" });
    const plan = find(bridge, "combobox", "Plan");
    expect(plan.value).toBe("Pro");
    expect(plan.component).toBe("Select");
    expect(plan.options).toEqual([
      { value: "free", label: "Free" },
      { value: "pro", label: "Pro", selected: true },
    ]);
    expect(find(bridge, "checkbox", "Accept terms")).toMatchObject({ checked: false, disabled: true });
    expect(snap.refs).toBe(6);
  });

  it("keeps refs stable across snapshots", () => {
    const root = mount(`<button>One</button><button>Two</button>`);
    const bridge = createAgentBridge({ root });
    const first = bridge.query({ role: "button" }).map((n) => n.ref);
    root.insertAdjacentHTML("afterbegin", "<button>Zero</button>");
    const second = bridge.query({ role: "button" }).map((n) => n.ref);
    expect(second.slice(1)).toEqual(first);
  });

  it("skips hidden, inert, aria-hidden, closed details, closed dialogs and excluded content", () => {
    const root = mount(`
      <button>Visible</button>
      <button hidden>Hidden attr</button>
      <div inert><button>Inert</button></div>
      <div aria-hidden="true"><button>Aria hidden</button></div>
      <div style="display:none"><button>Display none</button></div>
      <div style="visibility:hidden"><button>Visibility hidden</button></div>
      <details><summary>More</summary><button>In closed details</button></details>
      <details open><summary>Open section</summary><button>In open details</button></details>
      <dialog><button>In closed dialog</button></dialog>
      <dialog open aria-label="Open dialog"><button>In open dialog</button></dialog>
      <div data-kernel-agent-ignore><button>Ignored</button></div>
      <div class="private"><button>Excluded</button></div>
    `);
    const bridge = createAgentBridge({ root, exclude: ".private" });
    const names = bridge.query({}).map((n) => n.name);
    expect(names).toEqual(["Visible", "More", "Open section", "In open details", "Open dialog", "In open dialog"]);
    const more = find(bridge, "button", "More");
    expect(more.expanded).toBe(false);
  });

  it("redacts passwords, one-time codes, card fields and marked fields", () => {
    const root = mount(`
      <label>Email <input value="ada@example.com" /></label>
      <label>Password <input type="password" value="hunter2" /></label>
      <label>Code <input autocomplete="one-time-code" value="123456" /></label>
      <label>Card <input autocomplete="cc-number" value="4242424242424242" /></label>
      <label>Notes <textarea data-kernel-agent-redact>private</textarea></label>
      <label>Empty password <input type="password" /></label>
    `);
    const bridge = createAgentBridge({ root });
    const json = JSON.stringify(bridge.snapshot());
    for (const secret of ["hunter2", "123456", "4242424242424242", "private"]) expect(json).not.toContain(secret);
    expect(find(bridge, "textbox", "Email").value).toBe("ada@example.com");
    expect(find(bridge, "textbox", "Password")).toMatchObject({ value: REDACTED, redacted: true });
    expect(find(bridge, "textbox", "Code")).toMatchObject({ value: REDACTED, redacted: true });
    expect(find(bridge, "textbox", "Card")).toMatchObject({ value: REDACTED, redacted: true });
    expect(find(bridge, "textbox", "Notes")).toMatchObject({ value: REDACTED, redacted: true });
    expect(find(bridge, "textbox", "Empty password")).toMatchObject({ value: "", redacted: true });
    // Redacted values can't be found by searching for them either.
    expect(bridge.query({ text: "hunter2" })).toEqual([]);
  });

  it("limits refs to `include` while keeping context", () => {
    const root = mount(`<h1>Title</h1><nav aria-label="Main"><a href="/a">A</a></nav><section class="agent-zone"><button>Allowed</button></section>`);
    const bridge = createAgentBridge({ root, include: ".agent-zone" });
    const all = bridge.query({ actionable: false });
    expect(all.find((n) => n.role === "heading")).toBeTruthy();
    expect(all.find((n) => n.role === "link")?.ref).toBeUndefined();
    expect(bridge.query({}).map((n) => n.name)).toEqual(["Allowed"]);
  });
});

describe("act", () => {
  it("types into an input with real input/change events", async () => {
    const root = mount(`<label>Name <input id="name" /></label>`);
    const input = document.getElementById("name") as HTMLInputElement;
    const events: string[] = [];
    input.addEventListener("input", () => events.push(`input:${input.value}`));
    input.addEventListener("change", () => events.push(`change:${input.value}`));
    const bridge = createAgentBridge({ root });
    const ref = find(bridge, "textbox", "Name").ref!;
    const result = await bridge.act({ steps: [{ ref, action: "type", args: { text: "Ada" } }, { ref, action: "type", args: { text: " Lovelace", append: true } }] });
    expect(result.ok).toBe(true);
    expect(input.value).toBe("Ada Lovelace");
    expect(events).toEqual(["input:Ada", "change:Ada", "input:Ada Lovelace", "change:Ada Lovelace"]);
    expect(result.diff.changed[0]).toMatchObject({ ref, changes: { value: ["", "Ada Lovelace"] } });

    await bridge.act({ steps: [{ ref, action: "clear" }] });
    expect(input.value).toBe("");
  });

  it("checks, unchecks and toggles checkboxes and switches", async () => {
    const root = mount(`
      <label><input type="checkbox" id="cb" /> Terms</label>
      <button type="button" role="switch" aria-checked="false" id="sw">Wifi</button>
    `);
    const sw = document.getElementById("sw")!;
    sw.addEventListener("click", () => sw.setAttribute("aria-checked", String(sw.getAttribute("aria-checked") !== "true")));
    const bridge = createAgentBridge({ root });
    const cb = find(bridge, "checkbox", "Terms").ref!;
    const swRef = find(bridge, "switch", "Wifi").ref!;
    let result = await bridge.act({ steps: [{ ref: cb, action: "check" }, { ref: swRef, action: "check" }] });
    expect(result.ok).toBe(true);
    expect((document.getElementById("cb") as HTMLInputElement).checked).toBe(true);
    expect(sw.getAttribute("aria-checked")).toBe("true");

    result = await bridge.act({ steps: [{ ref: cb, action: "check" }] });
    expect(result.results[0]!.note).toBe("already checked");

    await bridge.act({ steps: [{ ref: swRef, action: "toggle" }, { ref: cb, action: "uncheck" }] });
    expect(sw.getAttribute("aria-checked")).toBe("false");
    expect((document.getElementById("cb") as HTMLInputElement).checked).toBe(false);
  });

  it("selects native options by value or label", async () => {
    const root = mount(`<label for="plan">Plan</label><select id="plan"><option value="free">Free</option><option value="team">Team plan</option></select>`);
    const select = document.getElementById("plan") as HTMLSelectElement;
    const changes: string[] = [];
    select.addEventListener("change", () => changes.push(select.value));
    const bridge = createAgentBridge({ root });
    const ref = find(bridge, "combobox", "Plan").ref!;
    await bridge.act({ steps: [{ ref, action: "select", args: { value: "team plan" } }] });
    expect(select.value).toBe("team");
    await bridge.act({ steps: [{ ref, action: "select", args: { value: "free" } }] });
    expect(changes).toEqual(["team", "free"]);
    const bad = await bridge.act({ steps: [{ ref, action: "select", args: { value: "enterprise" } }] });
    expect(bad.ok).toBe(false);
    expect(bad.results[0]!.error).toContain('No option "enterprise"');
  });

  it("selects an option in an ARIA listbox by pressing it", async () => {
    const root = mount(`
      <div role="listbox" aria-label="Colour">
        <div role="option" aria-selected="false" id="o1">Red</div>
        <div role="option" aria-selected="false" id="o2">Blue</div>
      </div>`);
    for (const option of Array.from(root.querySelectorAll('[role="option"]'))) {
      option.addEventListener("click", () => option.setAttribute("aria-selected", "true"));
    }
    const bridge = createAgentBridge({ root });
    const ref = find(bridge, "listbox", "Colour").ref!;
    const result = await bridge.act({ steps: [{ ref, action: "select", args: { value: "blue" } }] });
    expect(result.ok).toBe(true);
    expect(document.getElementById("o2")!.getAttribute("aria-selected")).toBe("true");
  });

  it("presses buttons, opens and closes details and dialogs", async () => {
    const root = mount(`
      <button id="count">Clicked 0</button>
      <details><summary>Advanced</summary><p>Options</p></details>
      <dialog open aria-label="Invite"><button data-slot="dialog-close" aria-label="Close" id="x"></button></dialog>
    `);
    let clicks = 0;
    const count = document.getElementById("count")!;
    count.addEventListener("click", () => (count.textContent = `Clicked ${++clicks}`));
    const dialog = root.querySelector("dialog")!;
    document.getElementById("x")!.addEventListener("click", () => dialog.removeAttribute("open"));
    const bridge = createAgentBridge({ root });
    const result = await bridge.act({
      steps: [
        { ref: find(bridge, "button", "Clicked 0").ref!, action: "press" },
        { ref: find(bridge, "button", "Advanced").ref!, action: "open" },
        { ref: find(bridge, "dialog", "Invite").ref!, action: "close" },
      ],
    });
    expect(result.ok).toBe(true);
    expect(count.textContent).toBe("Clicked 1");
    expect(root.querySelector("details")!.open).toBe(true);
    expect(dialog.open).toBe(false);
    expect(result.diff.removed.map((r) => r.role)).toContain("dialog");
  });

  it("refuses disabled, hidden, unknown and excluded targets with a clear error", async () => {
    const root = mount(`<button disabled>Off</button><button id="later">Later</button><button aria-disabled="true">Soft off</button>`);
    const bridge = createAgentBridge({ root });
    const off = find(bridge, "button", "Off").ref!;
    const soft = find(bridge, "button", "Soft off").ref!;
    const later = find(bridge, "button", "Later").ref!;
    document.getElementById("later")!.hidden = true;
    const result = await bridge.act({
      steps: [
        { ref: off, action: "press" },
        { ref: soft, action: "press" },
        { ref: later, action: "press" },
        { ref: "e999", action: "press" },
      ],
      continueOnError: true,
    });
    expect(result.ok).toBe(false);
    expect(result.results.map((r) => r.error)).toEqual([
      `"${off}" is disabled.`,
      `"${soft}" is disabled.`,
      `"${later}" is hidden, so a person couldn't use it either.`,
      'No element for ref "e999": it was removed or is out of scope. Take a fresh snapshot.',
    ]);
  });

  it("stops at the first failed step unless continueOnError", async () => {
    const root = mount(`<button disabled>Off</button><button>On</button>`);
    const bridge = createAgentBridge({ root });
    const result = await bridge.act({ steps: [{ ref: find(bridge, "button", "Off").ref!, action: "press" }, { ref: find(bridge, "button", "On").ref!, action: "press" }] });
    expect(result.results).toHaveLength(1);
  });

  it("submits a form with requestSubmit so submit handlers run", async () => {
    const root = mount(`<form aria-label="Signup"><label>Email <input name="email" /></label><button type="submit">Join</button></form>`);
    const form = root.querySelector("form")!;
    const submitted = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener("submit", submitted);
    const bridge = createAgentBridge({ root, confirm: () => true });
    const result = await bridge.act({ steps: [{ ref: find(bridge, "form", "Signup").ref!, action: "submit" }] });
    expect(result.ok).toBe(true);
    expect(result.results[0]!.confirmed).toBe(true);
    expect(submitted).toHaveBeenCalledTimes(1);
  });
});

describe("confirmation", () => {
  it("asks before marked, destructive and submitting steps, and refuses when declined", async () => {
    const root = mount(`
      <button data-kernel-agent-confirm="Delete the whole project">Delete</button>
      <button data-variant="danger">Remove member</button>
      <form aria-label="F" onsubmit="return false"><button>Send</button></form>
      <button id="safe">Refresh</button>
    `);
    const pressed: string[] = [];
    for (const button of Array.from(root.querySelectorAll("button"))) button.addEventListener("click", (e) => {
      pressed.push(button.textContent!);
      e.preventDefault();
    });
    const confirm = vi.fn(() => false);
    const bridge = createAgentBridge({ root, confirm });
    const result = await bridge.act({
      steps: ["Delete", "Remove member", "Send", "Refresh"].map((name) => ({ ref: find(bridge, "button", name).ref!, action: "press" as const })),
      continueOnError: true,
    });
    expect(confirm.mock.calls.map(([request]: any) => [request.reason, request.message])).toEqual([
      ["marked", "Delete the whole project"],
      ["destructive", 'Press "Remove member" (button)'],
      ["submit", 'Press "Send" (button)'],
    ]);
    expect(result.results.map((r) => r.ok)).toEqual([false, false, false, true]);
    expect(result.results[0]).toMatchObject({ confirmed: false, error: "A person declined this step." });
    expect(pressed).toEqual(["Refresh"]);
  });

  it("lets allow skip heuristic prompts but never an explicit marker", async () => {
    const root = mount(`<button data-variant="danger">Remove</button><button data-kernel-agent-confirm>Wipe</button>`);
    const confirm = vi.fn(() => true);
    const bridge = createAgentBridge({ root, confirm, allow: () => true });
    await bridge.act({ steps: [{ ref: find(bridge, "button", "Remove").ref!, action: "press" }] });
    expect(confirm).not.toHaveBeenCalled();
    await bridge.act({ steps: [{ ref: find(bridge, "button", "Wipe").ref!, action: "press" }] });
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("refuses when allow returns false and confirms on demand", async () => {
    const root = mount(`<button>Buy</button><label>Qty <input /></label>`);
    const confirm = vi.fn(async () => true);
    const bridge = createAgentBridge({
      root,
      confirm,
      allow: (step) => (step.action === "press" ? false : "confirm"),
    });
    const result = await bridge.act({
      steps: [
        { ref: find(bridge, "button", "Buy").ref!, action: "press" },
        { ref: find(bridge, "textbox", "Qty").ref!, action: "type", args: { text: "2" } },
      ],
      continueOnError: true,
    });
    expect(result.results[0]!.error).toBe("Refused by the app's allow policy.");
    expect(result.results[1]).toMatchObject({ ok: true, confirmed: true });
    expect((confirm.mock.calls[0] as any)[0].reason).toBe("policy");
  });

  it("opts out of heuristics with data-kernel-agent-confirm=false", async () => {
    const root = mount(`<form aria-label="Search" onsubmit="return false" data-kernel-agent-confirm="false"><button>Go</button></form>`);
    const confirm = vi.fn(() => false);
    const bridge = createAgentBridge({ root, confirm });
    const result = await bridge.act({ steps: [{ ref: find(bridge, "button", "Go").ref!, action: "press" }] });
    expect(result.ok).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });
});

describe("observe, settle and WebMCP", () => {
  it("reports debounced changes", async () => {
    const root = mount(`<button>A</button>`);
    const bridge = createAgentBridge({ root });
    bridge.snapshot();
    const seen = new Promise<string[]>((resolve) => {
      bridge.observe((diff) => resolve(diff.added.map((n) => n.name ?? "")), { debounce: 20 });
    });
    root.insertAdjacentHTML("beforeend", "<button>B</button>");
    expect(await seen).toEqual(["B"]);
    bridge.destroy();
  });

  it("is a no-op without WebMCP and registers tools with it", async () => {
    const root = mount(`<button>A</button>`);
    const bridge = createAgentBridge({ root });
    expect(isWebMcpAvailable()).toBe(false);
    expect(() => bridge.registerTools()()).not.toThrow();

    const tools = new Map<string, any>();
    const signals: AbortSignal[] = [];
    (document as any).modelContext = {
      registerTool: vi.fn(async (tool: any, options: { signal: AbortSignal }) => {
        tools.set(tool.name, tool);
        signals.push(options.signal);
      }),
    };
    try {
      expect(isWebMcpAvailable()).toBe(true);
      const unregister = bridge.registerTools({ prefix: "app" });
      expect([...tools.keys()]).toEqual(["app_snapshot", "app_query", "app_act"]);
      expect(tools.get("app_snapshot").annotations).toEqual({ readOnlyHint: true, untrustedContentHint: true });
      expect(tools.get("app_act").inputSchema.required).toEqual(["steps"]);

      const snap = await tools.get("app_snapshot").execute({});
      expect(snap.content[0].text).toMatch(/^- button "A" \[ref=e\d+\]$/);
      const [node] = JSON.parse((await tools.get("app_query").execute({ name: "A" })).content[0].text);
      const acted = JSON.parse((await tools.get("app_act").execute({ steps: [{ ref: node.ref, action: "press" }] })).content[0].text);
      expect(acted.ok).toBe(true);

      unregister();
      expect(signals.every((s) => s.aborted)).toBe(true);
    } finally {
      delete (document as any).modelContext;
    }
  });
});
