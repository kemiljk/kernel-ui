import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CommandPalette } from "./CommandPalette";

describe("CommandPalette", () => {
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
    expect(onOpenChange).toHaveBeenCalledWith(false);
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
