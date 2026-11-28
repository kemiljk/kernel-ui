import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Combobox } from "./components/Combobox/Combobox";
import { CommandPalette } from "./components/CommandPalette/CommandPalette";

const fruit = ["Pineapple", "Apple", "Grape", "Snapple", "Papaya"].map((label) => ({
  value: label.toLowerCase(),
  label,
}));

describe("Combobox fuzzy filtering", () => {
  it("ranks matches and marks the matched characters", () => {
    render(<Combobox label="Fruit" options={fruit} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "app" } });
    const options = screen.getAllByRole("option", { hidden: true });
    expect(options.map((option) => option.textContent)).toEqual(["Apple", "Snapple", "Pineapple"]); // "Papaya" has no second "p" after its "a"
    expect(options[0]!.querySelector("mark")?.textContent).toBe("App");
  });

  it("uses a custom filter when given, and emits clear when emptied", () => {
    const onValueChange = vi.fn();
    render(
      <Combobox
        label="Fruit"
        options={fruit}
        defaultValue="grape"
        onValueChange={onValueChange}
        filter={(text, query) => (text.toLowerCase().endsWith(query.toLowerCase()) ? 1 : 0)}
      />,
    );
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "ple" } });
    expect(screen.getAllByRole("option", { hidden: true }).map((o) => o.textContent)).toEqual([
      "Pineapple",
      "Apple",
      "Snapple",
    ]);
    fireEvent.change(input, { target: { value: "" } });
    expect(onValueChange).toHaveBeenLastCalledWith("", expect.objectContaining({ reason: "clear" }));
  });
});

describe("CommandPalette fuzzy filtering", () => {
  it("ranks the items API and highlights the label", () => {
    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        items={[
          { id: "settings", label: "Settings", onSelect: () => {} },
          { id: "sidebar", label: "Toggle sidebar", onSelect: () => {} },
          { id: "new", label: "New file", onSelect: () => {} },
        ]}
      />,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ts" } });
    const options = screen.getAllByRole("option");
    expect(options.map((option) => option.id)).toEqual(["sidebar", "settings"]);
    expect(Array.from(options[0]!.querySelectorAll("mark")).map((mark) => mark.textContent)).toEqual(["T", "s"]);
  });
});
