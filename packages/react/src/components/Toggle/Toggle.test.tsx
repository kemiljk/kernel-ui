import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toggle } from "./Toggle";

const Icon = () => <svg width="16" height="16" />;

describe("Toggle", () => {
  it("toggles aria-pressed on click", () => {
    render(<Toggle aria-label="Bold">B</Toggle>);
    const button = screen.getByRole("button", { name: "Bold" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("flags no icon slots for a text label", () => {
    render(<Toggle>Bold</Toggle>);
    const button = screen.getByRole("button");
    expect(button.hasAttribute("data-icon-start")).toBe(false);
    expect(button.hasAttribute("data-icon-end")).toBe(false);
  });

  it("flags both ends for an icon-only toggle, including an icon component", () => {
    render(
      <Toggle aria-label="Star">
        <Icon />
      </Toggle>,
    );
    const button = screen.getByRole("button", { name: "Star" });
    expect(button.getAttribute("data-icon-start")).toBe("true");
    expect(button.getAttribute("data-icon-end")).toBe("true");
  });

  it("flags only the leading end for icon + text", () => {
    render(
      <Toggle>
        <svg width="16" height="16" /> Starred
      </Toggle>,
    );
    const button = screen.getByRole("button");
    expect(button.getAttribute("data-icon-start")).toBe("true");
    expect(button.hasAttribute("data-icon-end")).toBe(false);
  });
});
