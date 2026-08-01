import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("applies wrapper and slot class hooks", () => {
    render(
      <Textarea
        label="Notes"
        description="Optional"
        wrapperClassName="wrap"
        labelClassName="lab"
        descriptionClassName="desc"
        className="ctrl"
      />,
    );

    expect(document.querySelector('[data-slot="textarea"]')?.className).toContain("wrap");
    expect(document.querySelector('[data-slot="textarea-label"]')?.className).toContain("lab");
    expect(document.querySelector('[data-slot="textarea-description"]')?.className).toContain(
      "desc",
    );
    expect(document.querySelector('[data-slot="textarea-control"]')?.className).toContain("ctrl");
  });

  it("tracks focused and filled state", () => {
    render(<Textarea label="Bio" />);
    const wrapper = document.querySelector('[data-slot="textarea"]')!;
    const control = screen.getByRole("textbox", { name: "Bio" });

    fireEvent.focus(control);
    expect(wrapper).toHaveAttribute("data-focused");
    fireEvent.change(control, { target: { value: "hello" } });
    expect(wrapper).toHaveAttribute("data-filled");
  });
});
