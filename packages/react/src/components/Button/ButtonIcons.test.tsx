import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

const Icon = () => <svg width="16" height="16" />;

describe("Button icon slots", () => {
  it("marks a leading icon", () => {
    render(<Button iconStart={<Icon />}>Search</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-icon-start", "true");
    expect(button).not.toHaveAttribute("data-icon-end");
  });

  it("marks a trailing icon", () => {
    render(<Button iconEnd={<Icon />}>Next</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-icon-end", "true");
    expect(button).not.toHaveAttribute("data-icon-start");
  });

  it("treats an icon with no label as icon-only", () => {
    render(<Button aria-label="Copy" iconEnd={<Icon />} />);
    const button = screen.getByRole("button", { name: "Copy" });
    expect(button).toHaveAttribute("data-icon-start", "true");
    expect(button).toHaveAttribute("data-icon-end", "true");
  });

  it("moves a lone icon child into the icon slot", () => {
    render(
      <Button aria-label="Close">
        <Icon />
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Close" });
    expect(button).toHaveAttribute("data-icon-start", "true");
    expect(button).toHaveAttribute("data-icon-end", "true");
    expect(button.querySelector("[class*='label']")).toBeNull();
  });

  it("leaves text-only buttons alone", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button");
    expect(button).not.toHaveAttribute("data-icon-start");
    expect(button).not.toHaveAttribute("data-icon-end");
  });
});
