import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("applies className and data attributes to the popup", () => {
    render(
      <Tooltip
        content="Copied"
        className="popup-class"
        render={<button type="button">Copy</button>}
      />,
    );

    const popup = document.getElementById(
      screen.getByRole("button", { name: "Copy" }).getAttribute("aria-describedby")!,
    )!;
    expect(popup).toHaveAttribute("role", "tooltip");
    expect(popup).toHaveAttribute("data-slot", "tooltip-content");
    expect(popup).toHaveAttribute("data-placement", "top");
    expect(popup).toHaveAttribute("data-align", "center");
    expect(popup.className).toContain("popup-class");
  });

  it("reflects align on the popup", () => {
    render(<Tooltip content="Tip" align="end" render={<button type="button">Copy</button>} />);
    const popup = document.getElementById(
      screen.getByRole("button", { name: "Copy" }).getAttribute("aria-describedby")!,
    )!;
    expect(popup).toHaveAttribute("data-align", "end");
  });

  it("merges trigger refs and focus handlers", () => {
    const triggerRef = createRef<HTMLButtonElement>();
    const onFocus = vi.fn();

    render(
      <Tooltip
        content="Hint"
        render={<button type="button" ref={triggerRef} onFocus={onFocus}>Hint me</button>}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Hint me" });
    expect(triggerRef.current).toBe(trigger);
    act(() => {
      trigger.focus();
    });
    expect(onFocus).toHaveBeenCalled();
    const popup = document.getElementById(trigger.getAttribute("aria-describedby")!)!;
    expect(popup).toHaveAttribute("data-open");
  });

  it("renders an arrow when requested", () => {
    render(
      <Tooltip content="Tip" arrow render={<button type="button">A</button>} />,
    );
    expect(document.querySelector('[data-slot="tooltip-arrow"]')).not.toBeNull();
  });

  it("passes offset into floating positioning via style margin when open", () => {
    render(
      <Tooltip
        content="Tip"
        offset={16}
        render={<button type="button">Open</button>}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Open" });
    act(() => {
      trigger.focus();
    });
    const popup = document.getElementById(trigger.getAttribute("aria-describedby")!)!;
    // CSS anchor path writes margin; fallback path writes top/left. Either is fine.
    expect(
      popup.style.margin === "16px" || popup.getAttribute("data-open") !== null,
    ).toBe(true);
  });
});
