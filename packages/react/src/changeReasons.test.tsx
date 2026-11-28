import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import "../../elements/src/components/Switch/Switch";
import "../../elements/src/components/Tabs/Tabs";
import "../../elements/src/components/Dialog/Dialog";
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
});
