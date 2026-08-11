import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Sheet, type SheetProps } from "./Sheet";

function ControlledSheet(props: Partial<SheetProps> & { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(true);
  const { onOpenChange, ...rest } = props;
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange?.(next);
        setOpen(next);
      }}
      title="Sheet title"
      {...rest}
    >
      <button type="button">Inside</button>
    </Sheet>
  );
}

/** jsdom has no PointerEvent, so `fireEvent.pointerX` synthesises a plain Event
 * with these props assigned. That's enough for the engine, which only reads
 * `pointerId`, `pointerType`, `button`, and the client coordinates. */
function drag(node: Element, from: number, to: number) {
  fireEvent.pointerDown(node, { pointerId: 1, pointerType: "touch", clientX: 0, clientY: from });
  fireEvent.pointerMove(node, { pointerId: 1, clientX: 0, clientY: to });
  return () => fireEvent.pointerUp(node, { pointerId: 1, clientX: 0, clientY: to });
}

describe("Sheet", () => {
  it("renders a real dialog anchored to the bottom by default", () => {
    render(<ControlledSheet />);
    const dialog = screen.getByRole("dialog", { name: "Sheet title" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).toHaveAttribute("data-side", "bottom");
  });

  it("renders the handle as decoration, and can omit it", () => {
    const { rerender } = render(<ControlledSheet />);
    const handle = document.querySelector('[data-slot="sheet-handle"]');
    expect(handle).not.toBeNull();
    expect(handle).toHaveAttribute("aria-hidden", "true");

    rerender(<ControlledSheet showHandle={false} />);
    expect(document.querySelector('[data-slot="sheet-handle"]')).toBeNull();
  });

  it("exposes a handle class hook alongside Dialog's slot hooks", () => {
    render(<ControlledSheet classNames={{ handle: "handle-x", content: "body-x" }} className="sheet-x" />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("sheet-x");
    expect(document.querySelector('[data-slot="sheet-handle"]')?.className).toContain("handle-x");
    expect(dialog.querySelector('[data-slot="dialog-content"]')?.className).toContain("body-x");
  });

  it("marks the drag and writes an inline transform once past the threshold", () => {
    render(<ControlledSheet />);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    const handle = document.querySelector('[data-slot="sheet-handle"]')!;

    drag(handle, 100, 140);
    expect(dialog).toHaveAttribute("data-dragging");
    expect(dialog.style.translate).toBe("0 40px");
    // The scrim tracks the drag through a custom property `::backdrop` inherits.
    expect(dialog.style.getPropertyValue("--kernel-sheet-drag-progress")).not.toBe("");
  });

  it("ignores movement below the drag threshold, so taps still work", () => {
    render(<ControlledSheet />);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    const handle = document.querySelector('[data-slot="sheet-handle"]')!;

    drag(handle, 100, 102)();
    expect(dialog).not.toHaveAttribute("data-dragging");
    expect(dialog.style.translate).toBe("");
  });

  it("dismisses on release after a fast drag toward the anchored edge", () => {
    const onOpenChange = vi.fn();
    render(<ControlledSheet onOpenChange={onOpenChange} />);
    const handle = document.querySelector('[data-slot="sheet-handle"]')!;

    drag(handle, 100, 300)();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not drag when dismissible is false", () => {
    const onOpenChange = vi.fn();
    render(<ControlledSheet dismissible={false} onOpenChange={onOpenChange} />);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    const handle = document.querySelector('[data-slot="sheet-handle"]')!;

    drag(handle, 100, 300)();
    expect(dialog).not.toHaveAttribute("data-dragging");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("handleOnly refuses drags that start in the body", () => {
    render(<ControlledSheet handleOnly />);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;

    drag(screen.getByRole("button", { name: "Inside" }), 100, 300)();
    expect(dialog).not.toHaveAttribute("data-dragging");

    drag(document.querySelector('[data-slot="sheet-handle"]')!, 100, 300);
    expect(dialog).toHaveAttribute("data-dragging");
  });

  it("never starts a drag from the backdrop, whose event target is the dialog", () => {
    render(<ControlledSheet />);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;

    drag(dialog, 100, 300)();
    expect(dialog).not.toHaveAttribute("data-dragging");
  });
});
