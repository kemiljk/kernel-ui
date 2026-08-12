import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Combobox } from "./Combobox";

describe("Combobox compound API", () => {
  it("keeps focus on the input while navigating rich grouped options", async () => {
    render(
      <Combobox label="Course" shouldFilter={false}>
        <Combobox.Input aria-label="Search course" />
        <Combobox.List>
          <Combobox.Group heading="Track">
            <Combobox.Item id="lesson" value="lesson">Lesson row</Combobox.Item>
            <Combobox.Item id="section" value="section">Section row</Combobox.Item>
          </Combobox.Group>
          <Combobox.Loading>Searching...</Combobox.Loading>
        </Combobox.List>
      </Combobox>,
    );

    const input = screen.getByRole("combobox", { name: "Search course" });
    input.focus();
    await waitFor(() => expect(input).toHaveAttribute("aria-activedescendant", "lesson"));
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", "section");
    expect(document.activeElement).toBe(input);
    expect(screen.getByRole("status")).toHaveTextContent("Searching...");
  });

  it("keeps externally controlled query values in sync", async () => {
    function Example() {
      const [query, setQuery] = useState("");
      return (
        <Combobox label="Course" shouldFilter={false}>
          <Combobox.Input value={query} onValueChange={setQuery} aria-label="Search" />
          <Combobox.List><Combobox.Item id="one" value="one">One</Combobox.Item></Combobox.List>
        </Combobox>
      );
    }

    render(<Example />);
    const input = screen.getByRole("combobox", { name: "Search" });
    fireEvent.change(input, { target: { value: "async query" } });
    await waitFor(() => expect(input).toHaveValue("async query"));
  });
});
