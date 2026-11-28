import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Kbd, resolveKbdKey } from "./Kbd";

describe("Kbd", () => {
  it("renders a single key as one <kbd>", () => {
    const { container } = render(<Kbd>Esc</Kbd>);
    const kbd = container.querySelector("kbd");
    expect(kbd).toHaveTextContent("Esc");
    expect(kbd?.querySelector("kbd")).toBeNull();
    expect(kbd).not.toHaveAttribute("data-combo");
  });

  it("nests one <kbd> per key with a real-text separator", () => {
    const { container } = render(<Kbd keys={["Ctrl", "Shift", "P"]} platform="other" />);
    const outer = container.firstElementChild!;
    expect(outer.tagName).toBe("KBD");
    expect(outer).toHaveAttribute("data-combo");
    const keys = outer.querySelectorAll(":scope > kbd");
    expect([...keys].map((key) => key.textContent)).toEqual(["Ctrl", "Shift", "P"]);
    expect(outer).toHaveTextContent("Ctrl+Shift+P");
  });

  it("resolves the mod alias per platform", () => {
    const { container, rerender } = render(<Kbd keys={["mod", "K"]} platform="other" />);
    expect(container.firstElementChild).toHaveTextContent("Ctrl+K");

    rerender(<Kbd keys={["mod", "K"]} platform="apple" />);
    const glyph = container.querySelector('[aria-hidden="true"]');
    expect(glyph).toHaveTextContent("⌘");
    // The symbol carries a spoken name for screen readers.
    expect(screen.getByText("Command")).toHaveClass("kernel-sr-only");
    expect(container.firstElementChild).toHaveAttribute("data-platform", "apple");
  });

  it("passes unknown keys through unchanged", () => {
    expect(resolveKbdKey("K", "apple")).toBe("K");
    expect(resolveKbdKey("alt", "apple")).toBe("⌥");
    expect(resolveKbdKey("alt", "other")).toBe("Alt");
  });

  it("accepts a custom separator", () => {
    const { container } = render(<Kbd keys={["G", "D"]} separator="then" />);
    expect(container.firstElementChild).toHaveTextContent("GthenD");
  });
});
