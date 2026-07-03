import { render, screen } from "@testing-library/react";
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
});
