import { act, createElement, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import type { AgentBridge } from "../src/index.js";
import { useAgentBridge } from "../src/react.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
  delete (document as { modelContext?: unknown }).modelContext;
});

it("creates a bridge on mount, drives React-controlled inputs, and cleans up", async () => {
  const signals: AbortSignal[] = [];
  (document as { modelContext?: unknown }).modelContext = {
    registerTool: vi.fn(async (_tool: unknown, options: { signal: AbortSignal }) => {
      signals.push(options.signal);
    }),
  };
  let bridge: AgentBridge | null = null;
  const seen: string[] = [];

  function Form() {
    const root = useRef<HTMLFormElement>(null);
    const [name, setName] = useState("");
    const [on, setOn] = useState(false);
    bridge = useAgentBridge({ root, registerTools: true });
    seen.push(name);
    return createElement(
      "form",
      { ref: root, "aria-label": "Profile" },
      createElement("label", { htmlFor: "n" }, "Name"),
      createElement("input", { id: "n", value: name, onChange: (e: { target: HTMLInputElement }) => setName(e.target.value) }),
      createElement("button", { type: "button", role: "switch", "aria-checked": on, onClick: () => setOn(!on) }, "Notify"),
      createElement("output", null, `Hello ${name || "nobody"}`),
    );
  }

  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(createElement(Form)));
  expect(bridge).not.toBeNull();
  expect(signals.length).toBe(3);

  const b = bridge!;
  const nameRef = b.query({ role: "textbox", name: "Name" })[0]!.ref!;
  const switchRef = b.query({ role: "switch" })[0]!.ref!;
  let result: Awaited<ReturnType<AgentBridge["act"]>> | undefined;
  await act(async () => {
    result = await b.act({ steps: [{ ref: nameRef, action: "type", args: { text: "Ada" } }, { ref: switchRef, action: "check" }] });
  });
  expect(result!.ok).toBe(true);
  expect(seen).toContain("Ada");
  expect((host.querySelector("input") as HTMLInputElement).value).toBe("Ada");
  expect(host.querySelector("button")!.getAttribute("aria-checked")).toBe("true");
  expect(b.query({ role: "status", actionable: false })[0]!.text).toBe("Hello Ada");

  await act(async () => root.unmount());
  expect(signals.every((s) => s.aborted)).toBe(true);
});
