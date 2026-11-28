import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import "../../elements/src/components/Switch/Switch";
import "../../elements/src/components/Tabs/Tabs";
import "../../elements/src/components/Dialog/Dialog";
import "../../elements/src/components/Checkbox/Checkbox";
import "../../elements/src/components/RadioGroup/RadioGroup";
import "../../elements/src/components/Select/Select";
import "../../elements/src/components/NumberField/NumberField";
import "../../elements/src/components/TagInput/TagInput";
import { TagInput } from "./components/TagInput/TagInput";
import { Checkbox } from "./components/Checkbox/Checkbox";
import { Dialog } from "./components/Dialog/Dialog";
import { Select, SelectOption } from "./components/Select/Select";
import { Switch } from "./components/Switch/Switch";
import { Tab, TabPanel, Tabs, TabsList } from "./components/Tabs/Tabs";
import type { ChangeDetails } from "./utils/changeDetails";

const reasonOf = (mock: ReturnType<typeof vi.fn>, call = 0) =>
  (mock.mock.calls[call]![1] as ChangeDetails).reason;

describe("change reasons: Switch", () => {
  it("reports press vs keyboard", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch onCheckedChange={onCheckedChange}>Wi-Fi</Switch>);
    const control = screen.getByRole("switch");
    await user.click(control);
    expect(onCheckedChange).toHaveBeenLastCalledWith(true, expect.objectContaining({ reason: "press" }));
    control.focus();
    await user.keyboard(" ");
    expect(onCheckedChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: "keyboard" }));
    expect(onCheckedChange.mock.calls[1]![1].event).toBeInstanceOf(Event);
  });

  it("cancel() keeps an uncontrolled switch as it was", async () => {
    const user = userEvent.setup();
    render(<Switch onCheckedChange={(_, details) => details.cancel()}>Wi-Fi</Switch>);
    await user.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("a one-argument callback keeps working", async () => {
    const user = userEvent.setup();
    const seen: boolean[] = [];
    render(<Switch onCheckedChange={(checked) => seen.push(checked)}>Wi-Fi</Switch>);
    await user.click(screen.getByRole("switch"));
    expect(seen).toEqual([true]);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });
});

describe("change reasons: Checkbox", () => {
  it("cancel() leaves the box unchecked", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn((_: boolean, details: ChangeDetails) => details.cancel());
    render(<Checkbox onCheckedChange={onCheckedChange}>Terms</Checkbox>);
    await user.click(screen.getByRole("checkbox"));
    expect(reasonOf(onCheckedChange)).toBe("press");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
});

function TabsFixture(props: { onValueChange?: (value: string, details: ChangeDetails) => void }) {
  return (
    <Tabs defaultValue="a" onValueChange={props.onValueChange}>
      <TabsList aria-label="Sections">
        <Tab value="a">A</Tab>
        <Tab value="b">B</Tab>
        <Tab value="c">C</Tab>
      </TabsList>
      <TabPanel value="a">Panel A</TabPanel>
      <TabPanel value="b">Panel B</TabPanel>
      <TabPanel value="c">Panel C</TabPanel>
    </Tabs>
  );
}

describe("change reasons: Tabs", () => {
  it("reports trigger-press vs keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TabsFixture onValueChange={onValueChange} />);
    await user.click(screen.getByRole("tab", { name: "B" }));
    expect(onValueChange).toHaveBeenLastCalledWith("b", expect.objectContaining({ reason: "trigger-press" }));
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith("c", expect.objectContaining({ reason: "keyboard" }));
  });

  it("cancel() keeps the current tab", async () => {
    const user = userEvent.setup();
    render(<TabsFixture onValueChange={(_, details) => details.cancel()} />);
    await user.click(screen.getByRole("tab", { name: "B" }));
    expect(screen.getByRole("tab", { name: "A" })).toHaveAttribute("aria-selected", "true");
  });
});

describe("change reasons: Select", () => {
  function SelectFixture(props: { onValueChange?: (value: string, details: ChangeDetails) => void; onChange?: () => void }) {
    return (
      <Select label="Fruit" defaultValue="apple" onValueChange={props.onValueChange} onChange={props.onChange}>
        <SelectOption value="apple">Apple</SelectOption>
        <SelectOption value="banana">Banana</SelectOption>
        <SelectOption value="cherry">Cherry</SelectOption>
      </Select>
    );
  }

  it("reports item-press, keyboard and typeahead", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<SelectFixture onValueChange={onValueChange} />);
    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "banana");
    expect(onValueChange).toHaveBeenLastCalledWith("banana", expect.objectContaining({ reason: "item-press" }));

    fireEvent.keyDown(select, { key: "ArrowDown" });
    fireEvent.change(select, { target: { value: "cherry" } });
    expect(onValueChange).toHaveBeenLastCalledWith("cherry", expect.objectContaining({ reason: "keyboard" }));

    fireEvent.keyDown(select, { key: "a" });
    fireEvent.change(select, { target: { value: "apple" } });
    expect(onValueChange).toHaveBeenLastCalledWith("apple", expect.objectContaining({ reason: "typeahead" }));
  });

  it("cancel() restores the previous option and skips onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SelectFixture onValueChange={(_, details) => details.cancel()} onChange={onChange} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    await user.selectOptions(select, "banana");
    expect(select.value).toBe("apple");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("change reasons: Dialog", () => {
  function DialogFixture(props: { onOpenChange: (open: boolean, details: ChangeDetails) => void }) {
    const [open, setOpen] = useState(true);
    return (
      <Dialog
        open={open}
        title="Settings"
        onOpenChange={(next, details) => {
          props.onOpenChange(next, details);
          if (!details.isCanceled) setOpen(next);
        }}
      >
        Body
      </Dialog>
    );
  }

  it("reports close-button, escape-key and outside-press", () => {
    const onOpenChange = vi.fn((_: boolean, details: ChangeDetails) => details.cancel());
    render(<DialogFixture onOpenChange={onOpenChange} />);
    const dialog = screen.getByRole("dialog", { hidden: true });
    fireEvent.click(screen.getByRole("button", { name: "Close", hidden: true }));
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    fireEvent.click(dialog);
    expect(onOpenChange.mock.calls.map(([open, details]) => [open, details.reason])).toEqual([
      [false, "close-button"],
      [false, "escape-key"],
      [false, "outside-press"],
    ]);
    // Every attempt was cancelled, so the dialog is still open.
    expect(dialog).toHaveAttribute("open");
    expect(dialog).not.toHaveAttribute("data-closing");
  });

  it("closes when not cancelled", () => {
    const onOpenChange = vi.fn();
    render(<DialogFixture onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Close", hidden: true }));
    expect(reasonOf(onOpenChange)).toBe("close-button");
    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute("data-closing");
  });

  it("reports a closedby light dismiss (backdrop press → cancel) as outside-press, once", () => {
    const onOpenChange = vi.fn((_: boolean, details: ChangeDetails) => details.cancel());
    render(<DialogFixture onOpenChange={onOpenChange} />);
    const dialog = screen.getByRole("dialog", { hidden: true });
    fireEvent.pointerDown(dialog);
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    fireEvent.click(dialog);
    // A later Escape is still an Escape.
    fireEvent.keyDown(dialog, { key: "Escape" });
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(onOpenChange.mock.calls.map(([, details]) => details.reason)).toEqual(["outside-press", "escape-key"]);
  });
});

describe("change reasons: custom elements", () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("kernel-switch dispatches a cancelable change before flipping", async () => {
    document.body.innerHTML = "<kernel-switch>Wi-Fi</kernel-switch>";
    const host = document.querySelector("kernel-switch")!;
    const reasons: string[] = [];
    host.addEventListener("change", (event) => {
      const detail = (event as CustomEvent).detail;
      reasons.push(detail.reason);
      // State hasn't moved yet when the event fires.
      expect(host.hasAttribute("checked")).toBe(false);
      event.preventDefault();
    });
    const button = host.querySelector("button")!;
    fireEvent.pointerDown(button);
    fireEvent.click(button, { detail: 1 });
    expect(reasons).toEqual(["press"]);
    expect(host.hasAttribute("checked")).toBe(false);
    expect(button.getAttribute("aria-checked")).toBe("false");
  });

  it("kernel-tabs valuechange carries the reason and can be vetoed", async () => {
    document.body.innerHTML = `
      <kernel-tabs default-value="a">
        <kernel-tabs-list aria-label="Sections">
          <kernel-tab value="a">A</kernel-tab>
          <kernel-tab value="b">B</kernel-tab>
        </kernel-tabs-list>
        <kernel-tab-panel value="a">Panel A</kernel-tab-panel>
        <kernel-tab-panel value="b">Panel B</kernel-tab-panel>
      </kernel-tabs>`;
    await flush();
    const tabs = document.querySelector("kernel-tabs")!;
    const details: Array<{ value: string; reason: string }> = [];
    let veto = true;
    tabs.addEventListener("valuechange", (event) => {
      details.push((event as CustomEvent).detail);
      if (veto) event.preventDefault();
    });
    const tabB = screen.getByRole("tab", { name: "B" });
    fireEvent.keyDown(tabB, { key: "Enter" });
    fireEvent.click(tabB);
    expect(details[0]).toMatchObject({ value: "b", reason: "keyboard" });
    expect(tabB).toHaveAttribute("aria-selected", "false");

    veto = false;
    fireEvent.pointerDown(tabB);
    fireEvent.click(tabB);
    expect(details[1]).toMatchObject({ value: "b", reason: "trigger-press" });
    expect(tabB).toHaveAttribute("aria-selected", "true");
  });

  it("kernel-dialog fires a cancelable cancel with the reason before closing", () => {
    document.body.innerHTML = '<kernel-dialog title="Settings" open>Body</kernel-dialog>';
    const host = document.querySelector("kernel-dialog")!;
    const reasons: string[] = [];
    host.addEventListener("cancel", (event) => {
      reasons.push((event as CustomEvent).detail.reason);
      event.preventDefault();
    });
    const dialog = host.querySelector("dialog")!;
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    fireEvent.click(host.querySelector('[data-slot="dialog-close"]')!);
    expect(reasons).toEqual(["escape-key", "close-button"]);
    expect(host).toHaveAttribute("open");
  });

  it("kernel-dialog reports a closedby light dismiss as outside-press, once", () => {
    document.body.innerHTML = '<kernel-dialog title="Settings" open>Body</kernel-dialog>';
    const host = document.querySelector("kernel-dialog")!;
    const reasons: string[] = [];
    host.addEventListener("cancel", (event) => {
      reasons.push((event as CustomEvent).detail.reason);
      event.preventDefault();
    });
    const dialog = host.querySelector("dialog")!;
    // What a closedby="any" browser does for a backdrop press: pointerdown on
    // the dialog (the backdrop), a `cancel`, then the click.
    fireEvent.pointerDown(dialog);
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    fireEvent.click(dialog);
    expect(reasons).toEqual(["outside-press"]);
    // close-on-backdrop-click="false" also holds against the light dismiss.
    host.setAttribute("close-on-backdrop-click", "false");
    fireEvent.pointerDown(dialog);
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    fireEvent.click(dialog);
    expect(reasons).toEqual(["outside-press"]);
    expect(host).toHaveAttribute("open");
  });
});

/*
 * Native-backed elements can't cancel the browser's own `change`, so they
 * dispatch a cancelable `valuechange` first; vetoing it must restore the
 * previous state *and* keep the native `change` from reaching the host.
 */
describe("change reasons: custom element valuechange interception", () => {
  function track(host: Element, veto: boolean) {
    const seen: Array<{ reason: string; [key: string]: unknown }> = [];
    const hostChanges: Event[] = [];
    host.addEventListener("valuechange", (event) => {
      seen.push((event as CustomEvent).detail);
      if (veto) event.preventDefault();
    });
    host.addEventListener("change", (event) => hostChanges.push(event));
    return { seen, hostChanges };
  }

  it("kernel-checkbox: veto unticks the box and stops the host change", () => {
    document.body.innerHTML = "<kernel-checkbox>Accept</kernel-checkbox>";
    const host = document.querySelector("kernel-checkbox")!;
    const { seen, hostChanges } = track(host, true);
    const input = host.querySelector("input")!;
    fireEvent.pointerDown(input);
    fireEvent.click(input);
    expect(seen).toEqual([expect.objectContaining({ checked: true, reason: "press" })]);
    expect(input.checked).toBe(false);
    expect(hostChanges).toHaveLength(0);
  });

  it("kernel-checkbox: without a veto the change goes through", () => {
    document.body.innerHTML = "<kernel-checkbox>Accept</kernel-checkbox>";
    const host = document.querySelector("kernel-checkbox")!;
    const { seen, hostChanges } = track(host, false);
    const input = host.querySelector("input")!;
    fireEvent.keyDown(input, { key: " " });
    fireEvent.click(input);
    expect(seen).toEqual([expect.objectContaining({ checked: true, reason: "keyboard" })]);
    expect(input.checked).toBe(true);
    expect(hostChanges).toHaveLength(1);
  });

  it("kernel-radio-group: veto re-checks the previous option and stops the host change", () => {
    document.body.innerHTML = `
      <kernel-radio-group label="Size" value="s">
        <kernel-radio-group-item value="s">Small</kernel-radio-group-item>
        <kernel-radio-group-item value="m">Medium</kernel-radio-group-item>
      </kernel-radio-group>`;
    const host = document.querySelector("kernel-radio-group")!;
    const { seen, hostChanges } = track(host, true);
    const medium = screen.getByRole("radio", { name: "Medium" }) as HTMLInputElement;
    fireEvent.pointerDown(medium);
    fireEvent.click(medium);
    expect(seen).toEqual([expect.objectContaining({ value: "m", reason: "press" })]);
    expect((screen.getByRole("radio", { name: "Small" }) as HTMLInputElement).checked).toBe(true);
    expect(medium.checked).toBe(false);
    expect(host.getAttribute("value")).toBe("s");
    expect(hostChanges).toHaveLength(0);
  });

  it("kernel-select: veto restores the previous option and stops the host change", () => {
    document.body.innerHTML = `
      <kernel-select label="Fruit" value="apple">
        <option value="apple">Apple</option>
        <option value="banana">Banana</option>
      </kernel-select>`;
    const host = document.querySelector("kernel-select")!;
    const { seen, hostChanges } = track(host, true);
    const select = host.querySelector("select")!;
    fireEvent.focus(select);
    fireEvent.keyDown(select, { key: "b" });
    select.value = "banana";
    fireEvent.change(select);
    expect(seen).toEqual([expect.objectContaining({ value: "banana", reason: "typeahead" })]);
    expect(select.value).toBe("apple");
    expect(hostChanges).toHaveLength(0);
  });

  it("kernel-select: a vetoed change after an accepted one restores the accepted value", () => {
    document.body.innerHTML = `
      <kernel-select label="Fruit" value="apple">
        <option value="apple">Apple</option>
        <option value="banana">Banana</option>
        <option value="cherry">Cherry</option>
      </kernel-select>`;
    const host = document.querySelector("kernel-select")!;
    let veto = false;
    const reasons: string[] = [];
    host.addEventListener("valuechange", (event) => {
      reasons.push((event as CustomEvent).detail.reason);
      if (veto) event.preventDefault();
    });
    const select = host.querySelector("select")!;
    fireEvent.focus(select);
    fireEvent.pointerDown(select);
    select.value = "banana";
    fireEvent.change(select);
    veto = true;
    fireEvent.keyDown(select, { key: "ArrowDown" });
    select.value = "cherry";
    fireEvent.change(select);
    expect(reasons).toEqual(["item-press", "keyboard"]);
    expect(select.value).toBe("banana");
  });

  it("kernel-number-field: veto restores a typed value and a stepped one", () => {
    document.body.innerHTML = '<kernel-number-field label="Qty" value="1"></kernel-number-field>';
    const host = document.querySelector("kernel-number-field")!;
    const { seen, hostChanges } = track(host, true);
    const input = host.querySelector("input")!;
    fireEvent.keyDown(input, { key: "7" });
    input.value = "7";
    fireEvent.change(input);
    expect(input.value).toBe("1");
    expect(host.getAttribute("value")).toBe("1");
    fireEvent.click(host.querySelector('[data-step="up"]')!);
    expect(input.value).toBe("1");
    expect(seen.map((detail) => detail.reason)).toEqual(["input", "step-button"]);
    expect(hostChanges).toHaveLength(0);
  });

  it("kernel-number-field: without a veto, a step commits and fires the host change", () => {
    document.body.innerHTML = '<kernel-number-field label="Qty" value="1"></kernel-number-field>';
    const host = document.querySelector("kernel-number-field")!;
    const { seen, hostChanges } = track(host, false);
    fireEvent.click(host.querySelector('[data-step="up"]')!);
    expect(seen).toEqual([expect.objectContaining({ value: 2, reason: "step-button" })]);
    expect(host.getAttribute("value")).toBe("2");
    expect(hostChanges).toHaveLength(1);
  });
});

describe("change reasons: TagInput batching parity", () => {
  function paste(target: Element, text: string) {
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: { getData: () => text } });
    target.dispatchEvent(event);
  }

  it("React and kernel-tag-input each report a multi-part paste as one change", () => {
    const onValueChange = vi.fn();
    const { container: reactRoot } = render(<TagInput label="React tags" onValueChange={onValueChange} />);
    paste(reactRoot.querySelector("input")!, "one,two\nthree");
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(["one", "two", "three"], expect.objectContaining({ reason: "paste" }));

    const container = document.createElement("div");
    container.innerHTML = '<kernel-tag-input label="Element tags"></kernel-tag-input>';
    document.body.append(container);
    const host = container.querySelector("kernel-tag-input")!;
    const changes: Array<{ tags: string[]; reason: string }> = [];
    host.addEventListener("change", (event) => changes.push((event as CustomEvent).detail));
    paste(host.querySelector("input")!, "one,two\nthree");
    expect(changes).toEqual([expect.objectContaining({ tags: ["one", "two", "three"], reason: "paste" })]);
    container.remove();
  });

  it("kernel-tag-input: a vetoed batch commits nothing and keeps the draft", () => {
    document.body.innerHTML = '<kernel-tag-input label="Tags" value="keep"></kernel-tag-input>';
    const host = document.querySelector("kernel-tag-input") as HTMLElement & { tags: string[] };
    const changes: Array<{ tags: string[]; reason: string }> = [];
    host.addEventListener("change", (event) => {
      changes.push((event as CustomEvent).detail);
      event.preventDefault();
    });
    const input = host.querySelector("input")!;
    paste(input, "a,b");
    expect(changes).toEqual([expect.objectContaining({ tags: ["keep", "a", "b"], reason: "paste" })]);
    expect(host.tags).toEqual(["keep"]);
    // A typed delimiter: one change for the split draft, reason "separator";
    // vetoed, the text stays in the draft without its delimiter.
    input.value = "c,";
    fireEvent.input(input);
    expect(changes[1]).toMatchObject({ tags: ["keep", "c"], reason: "separator" });
    expect(host.tags).toEqual(["keep"]);
    expect(input.value).toBe("c");
  });
});
