import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CommandPalette } from "./CommandPalette";

describe("CommandPalette", () => {
  it("closes its native dialog immediately and keeps native cancel controlled", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<CommandPalette open onOpenChange={onOpenChange} />);
    const dialog = screen.getByRole("dialog");

    expect(dialog).toHaveAttribute("open");
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: "escape-key" }));

    rerender(<CommandPalette open={false} onOpenChange={onOpenChange} />);
    expect(dialog).not.toHaveAttribute("open");
    expect(dialog).not.toHaveAttribute("data-state");
    expect(dialog).not.toHaveAttribute("data-closing");
  });

  it("keeps the legacy items API filtering and selection behavior", async () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <CommandPalette
        open
        onOpenChange={onOpenChange}
        items={[
          { id: "new-file", label: "New file", onSelect },
          { id: "save", label: "Save", description: "Save the document", onSelect },
        ]}
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "document" } });
    expect(screen.getByRole("option")).toHaveAttribute("id", "save");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: "item-keyboard" }));
  });

  it("supports controlled query state and compound rich options", async () => {
    function Example() {
      const [query, setQuery] = useState("");
      return (
        <CommandPalette open onOpenChange={() => {}} shouldFilter={false}>
          <CommandPalette.Input value={query} onValueChange={setQuery} aria-label="Search lessons" />
          <CommandPalette.List>
            <CommandPalette.Group heading="Engineering Track">
              <CommandPalette.Item id="lesson-flexbox" value="flexbox" onSelect={() => {}}>
                {({ active }) => <span data-testid="lesson-state">{active ? "active lesson" : "lesson"}</span>}
              </CommandPalette.Item>
              <CommandPalette.Item id="disabled-section" value="section" disabled onSelect={() => {}}>
                Disabled section
              </CommandPalette.Item>
              <CommandPalette.Item id="section-flexbox-layout" value="layout" onSelect={() => {}}>
                Section result
              </CommandPalette.Item>
            </CommandPalette.Group>
            <CommandPalette.Loading>Searching...</CommandPalette.Loading>
          </CommandPalette.List>
        </CommandPalette>
      );
    }

    render(<Example />);
    const input = screen.getByRole("combobox", { name: "Search lessons" });
    await waitFor(() => expect(input).toHaveAttribute("aria-activedescendant", "lesson-flexbox"));
    expect(screen.getByTestId("lesson-state")).toHaveTextContent("active lesson");
    expect(screen.getByRole("status")).toHaveTextContent("Searching...");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", "section-flexbox-layout");
    expect(screen.getByTestId("lesson-state")).toHaveTextContent("lesson");
  });

  it("preserves the active stable ID when compound results are replaced", async () => {
    function Example() {
      const [results, setResults] = useState(["one", "two"]);
      return (
        <>
          <button type="button" onClick={() => setResults(["two", "three"])}>Replace</button>
          <CommandPalette open onOpenChange={() => {}}>
            <CommandPalette.Input aria-label="Search" />
            <CommandPalette.List>
              {results.map((result) => (
                <CommandPalette.Item key={result} id={result} value={result} onSelect={() => {}}>
                  {result}
                </CommandPalette.Item>
              ))}
            </CommandPalette.List>
          </CommandPalette>
        </>
      );
    }

    render(<Example />);
    const input = screen.getByRole("combobox", { name: "Search" });
    await waitFor(() => expect(input).toHaveAttribute("aria-activedescendant", "one"));
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", "two");
    fireEvent.click(screen.getByRole("button", { name: "Replace" }));
    await waitFor(() => expect(input).toHaveAttribute("aria-activedescendant", "two"));
    expect(document.getElementById("two")).toBeInTheDocument();
  });
});

describe("CommandPalette highlight", () => {
  const items = ["Go to Dashboard", "Go to Settings", "Go to Billing", "New project"].map((label) => ({
    id: label.toLowerCase().replace(/\s+/g, "-"),
    label,
  }));

  function Example({ onRun }: { onRun: (label: string) => void }) {
    const [open, setOpen] = useState(false);
    // Stable the way an app would memoise them: nothing re-registers on reopen.
    const [stableItems] = useState(() => items.map((item) => ({ ...item, onSelect: () => onRun(item.label) })));
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>Search commands</button>
        <CommandPalette open={open} onOpenChange={setOpen} items={stableItems} placeholder="Search" />
      </>
    );
  }

  it("highlights the first match on open, including a reopen over the same items", async () => {
    const onRun = vi.fn();
    render(<Example onRun={onRun} />);
    const trigger = screen.getByRole("button", { name: "Search commands" });

    fireEvent.click(trigger);
    const input = screen.getByRole("combobox");
    await waitFor(() => expect(input).toHaveAttribute("aria-activedescendant", "go-to-dashboard"));
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(trigger);
    await waitFor(() => expect(input).toHaveAttribute("aria-activedescendant", "go-to-dashboard"));
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onRun).toHaveBeenCalledWith("Go to Dashboard");
  });

  it("moves the highlight to the first match when the query changes", async () => {
    const onRun = vi.fn();
    render(<Example onRun={onRun} />);
    fireEvent.click(screen.getByRole("button", { name: "Search commands" }));
    const input = screen.getByRole("combobox");
    await waitFor(() => expect(input).toHaveAttribute("aria-activedescendant", "go-to-dashboard"));

    // Arrow to Settings, then type a query Settings still matches: the
    // highlight goes to the top-ranked result instead of staying put. The
    // three "Go to" items tie on score, so the shortest, Billing, ranks first.
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", "go-to-settings");
    fireEvent.change(input, { target: { value: "go to" } });
    await waitFor(() => expect(input).toHaveAttribute("aria-activedescendant", "go-to-billing"));

    fireEvent.change(input, { target: { value: "set" } });
    await waitFor(() => expect(input).toHaveAttribute("aria-activedescendant", "go-to-settings"));
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onRun).toHaveBeenCalledWith("Go to Settings");
  });
});
