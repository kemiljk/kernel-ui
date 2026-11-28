import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../../elements/src/components/CommandPalette/CommandPalette";
import type { KernelCommandPalette } from "../../../../elements/src/components/CommandPalette/CommandPalette";

// `<kernel-command-palette>` highlights the first match whenever it opens
// or the query changes, so typing and pressing Enter runs the top result —
// the same contract as `@kernelui-lib/react`'s `<CommandPalette>`.

// jsdom has no layout, so no `scrollIntoView`; arrow keys call it.
Element.prototype.scrollIntoView ??= () => {};

function setup() {
  document.body.innerHTML = `<kernel-command-palette></kernel-command-palette>`;
  const palette = document.querySelector("kernel-command-palette") as KernelCommandPalette;
  const ran = vi.fn();
  palette.items = ["Go to Dashboard", "Go to Settings", "Go to Billing", "New project"].map((label) => ({
    id: label,
    label,
    onSelect: () => ran(label),
  }));
  const input = palette.querySelector<HTMLInputElement>("[role=combobox]")!;
  const active = () => document.getElementById(input.getAttribute("aria-activedescendant") ?? "")?.textContent;
  const type = (value: string) => {
    input.value = value;
    input.dispatchEvent(new Event("input"));
  };
  const press = (key: string) => input.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true }));
  return { palette, ran, input, active, type, press };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("<kernel-command-palette> highlight", () => {
  it("highlights the first match on open and after each query", () => {
    const { palette, ran, active, type, press } = setup();
    palette.setAttribute("open", "");
    expect(active()).toBe("Go to Dashboard");

    // Settings still matches "go to", but the highlight moves to the
    // top-ranked match: the three tie on score, so the shortest, Billing.
    press("ArrowDown");
    expect(active()).toBe("Go to Settings");
    type("go to");
    expect(active()).toBe("Go to Billing");

    type("set");
    press("Enter");
    expect(ran).toHaveBeenCalledWith("Go to Settings");
  });

  it("falls back to the first match when new items are shorter than the highlight", () => {
    const { palette, ran, active, press } = setup();
    palette.setAttribute("open", "");
    press("ArrowDown");
    press("ArrowDown");
    press("ArrowDown");
    expect(active()).toBe("New project");

    palette.items = [{ id: "invite", label: "Invite teammate", onSelect: () => ran("Invite teammate") }];
    expect(active()).toBe("Invite teammate");
    press("Enter");
    expect(ran).toHaveBeenCalledWith("Invite teammate");
  });
});
