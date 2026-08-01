import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("associates the label with the input", () => {
    render(<TextField label="Email" id="email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("id", "email");
  });

  it("exposes invalid state to assistive tech", () => {
    render(
      <TextField
        label="Email"
        invalid
        errorMessage="Enter a valid email address"
      />,
    );
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address");
  });

  it("applies slot class hooks to the documented elements", () => {
    render(
      <TextField
        label="Name"
        description="Helper"
        wrapperClassName="wrap"
        labelClassName="lab"
        descriptionClassName="desc"
        className="ctrl"
      />,
    );

    expect(document.querySelector('[data-slot="text-field"]')?.className).toContain("wrap");
    expect(document.querySelector('[data-slot="text-field-label"]')?.className).toContain("lab");
    expect(document.querySelector('[data-slot="text-field-description"]')?.className).toContain(
      "desc",
    );
    expect(document.querySelector('[data-slot="text-field-control"]')?.className).toContain("ctrl");
  });

  it("tracks focused and filled state for controlled and uncontrolled values", () => {
    function Controlled() {
      const [value, setValue] = useState("");
      return (
        <TextField
          label="Controlled"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      );
    }

    const { rerender } = render(<Controlled />);
    const wrapper = document.querySelector('[data-slot="text-field"]')!;
    const input = screen.getByRole("textbox", { name: "Controlled" });

    expect(wrapper).not.toHaveAttribute("data-filled");
    fireEvent.focus(input);
    expect(wrapper).toHaveAttribute("data-focused");
    fireEvent.change(input, { target: { value: "hi" } });
    expect(wrapper).toHaveAttribute("data-filled");
    fireEvent.blur(input);
    expect(wrapper).not.toHaveAttribute("data-focused");

    rerender(<TextField label="Uncontrolled" defaultValue="preset" />);
    expect(document.querySelector('[data-slot="text-field"]')).toHaveAttribute("data-filled");
  });

  it("exposes filled/focused through className state callbacks", () => {
    render(
      <TextField
        label="Anim"
        defaultValue="x"
        labelClassName={({ filled, focused }) =>
          [filled ? "filled" : "", focused ? "focused" : ""].filter(Boolean).join(" ")
        }
      />,
    );
    const label = document.querySelector('[data-slot="text-field-label"]')!;
    expect(label.className).toContain("filled");
    fireEvent.focus(screen.getByRole("textbox", { name: "Anim" }));
    expect(label.className).toContain("focused");
  });
});
