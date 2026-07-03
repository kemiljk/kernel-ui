import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders a native button with type button by default", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
  });

  it("applies the variant as a data attribute", () => {
    render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole("button", { name: "Primary" })).toHaveAttribute(
      "data-variant",
      "primary",
    );
  });
});
