import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ModelPicker, type ModelPickerOption } from "./ModelPicker";

/** jsdom has no popover API: a minimal stand-in that flips the attribute
 * and fires the same `toggle` event the component listens for. */
beforeAll(() => {
  if (!HTMLElement.prototype.showPopover) {
    const toggle = (el: HTMLElement, newState: "open" | "closed") => {
      const event = new Event("toggle") as Event & { newState: string };
      Object.defineProperty(event, "newState", { value: newState });
      el.dispatchEvent(event);
    };
    HTMLElement.prototype.showPopover = function showPopover(this: HTMLElement) {
      if (this.hasAttribute("data-test-open")) throw new Error("already open");
      this.setAttribute("data-test-open", "");
      toggle(this, "open");
    };
    HTMLElement.prototype.hidePopover = function hidePopover(this: HTMLElement) {
      if (!this.hasAttribute("data-test-open")) throw new Error("already closed");
      this.removeAttribute("data-test-open");
      toggle(this, "closed");
    };
  }
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0));
  Element.prototype.scrollIntoView = function scrollIntoView() {};
});

const OPTIONS: ModelPickerOption[] = [
  { value: "opus", label: "Opus", description: "Most capable", group: "Anthropic", badges: [{ label: "New", variant: "accent" }] },
  { value: "sonnet", label: "Sonnet", description: "Balanced", group: "Anthropic", badges: ["Fast"] },
  { value: "haiku", label: "Haiku", group: "Anthropic", disabled: true },
  { value: "solar", label: "Solar", group: "Other" },
  { value: "sigma", label: "Sigma", group: "Other" },
];

function activeOption() {
  const list = screen.getByRole("listbox", { hidden: true });
  const id = list.getAttribute("aria-activedescendant");
  return id ? document.getElementById(id) : null;
}

describe("ModelPicker", () => {
  it("names the trigger with the model and groups options by provider", () => {
    render(<ModelPicker options={OPTIONS} defaultValue="sonnet" />);
    const trigger = screen.getByRole("button", { name: "Model, Sonnet" });
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    const groups = screen.getAllByRole("group", { hidden: true });
    expect(groups.map((g) => g.getAttribute("aria-labelledby") && document.getElementById(g.getAttribute("aria-labelledby")!)?.textContent)).toEqual(["Anthropic", "Other"]);
    expect(screen.getByRole("option", { name: /Sonnet/, hidden: true })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: /Haiku/, hidden: true })).toHaveAttribute("aria-disabled", "true");
  });

  it("opens from the keyboard, skips disabled options and selects with Enter", async () => {
    const onValueChange = vi.fn();
    render(<ModelPicker options={OPTIONS} defaultValue="sonnet" onValueChange={onValueChange} />);
    const trigger = screen.getByRole("button");
    await act(async () => {
      fireEvent.keyDown(trigger, { key: "ArrowDown" });
      await new Promise((r) => setTimeout(r, 5));
    });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(activeOption()?.textContent).toContain("Sonnet");

    const list = screen.getByRole("listbox", { hidden: true });
    act(() => {
      fireEvent.keyDown(list, { key: "ArrowDown" });
    });
    // Haiku is disabled, so ArrowDown lands on Solar.
    expect(activeOption()?.textContent).toContain("Solar");
    await act(async () => {
      fireEvent.keyDown(list, { key: "Enter" });
      await new Promise((r) => setTimeout(r, 5));
    });
    expect(onValueChange).toHaveBeenCalledWith("solar");
    expect(trigger).toHaveAccessibleName("Model, Solar");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger);
  });

  it("typeaheads by name, cycling on a repeated letter", async () => {
    render(<ModelPicker options={OPTIONS} defaultValue="opus" />);
    const trigger = screen.getByRole("button");
    await act(async () => {
      fireEvent.keyDown(trigger, { key: "ArrowDown" });
      await new Promise((r) => setTimeout(r, 5));
    });
    const list = screen.getByRole("listbox", { hidden: true });
    act(() => {
      fireEvent.keyDown(list, { key: "s" });
    });
    expect(activeOption()?.textContent).toContain("Sonnet");
    act(() => {
      fireEvent.keyDown(list, { key: "s" });
    });
    expect(activeOption()?.textContent).toContain("Solar");
  });

  it("is controlled through value", async () => {
    const { rerender } = render(<ModelPicker options={OPTIONS} value="opus" onValueChange={() => {}} name="model" />);
    expect(screen.getByRole("button")).toHaveAccessibleName("Model, Opus");
    expect(document.querySelector<HTMLInputElement>('input[name="model"]')?.value).toBe("opus");
    rerender(<ModelPicker options={OPTIONS} value="sigma" onValueChange={() => {}} name="model" />);
    expect(screen.getByRole("button")).toHaveAccessibleName("Model, Sigma");
  });

  it("shows the placeholder label, which can be translated", () => {
    render(<ModelPicker options={OPTIONS} labels={{ model: "Modèle", placeholder: "Choisir" }} />);
    expect(screen.getByRole("button")).toHaveAccessibleName("Modèle, Choisir");
  });
});
