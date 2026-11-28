import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TagInput } from "./TagInput";

describe("TagInput", () => {
  it("keeps the text input a labelled, described textbox outside the tag list", () => {
    render(<TagInput label="Skills" description="Press Enter to add" defaultValue={["design", "a11y"]} />);
    const input = screen.getByRole("textbox", { name: "Skills" });
    expect(input).not.toHaveAttribute("role");
    expect(input).toHaveAccessibleDescription("Press Enter to add");

    const list = screen.getByRole("list", { name: "Skills" });
    expect(within(list).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["design", "a11y"]);
    expect(list.contains(input)).toBe(false);
  });

  it("renders no list while there are no tags, and one once a tag is committed", () => {
    render(<TagInput label="Skills" />);
    expect(screen.queryByRole("list")).toBeNull();

    const input = screen.getByRole("textbox", { name: "Skills" });
    fireEvent.change(input, { target: { value: "react" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(within(screen.getByRole("list", { name: "Skills" })).getByRole("listitem")).toHaveTextContent("react");
  });
});
