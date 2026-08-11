import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { VelocityTracker } from "../../utils/sheetDrag";
import { Sheet, type SheetProps } from "./Sheet";

/** jsdom lays nothing out, so every element measures 0 and the engine's
 * distance rules — all proportions of the sheet's own size — degenerate. A fixed
 * offsetHeight is the smallest stand-in that makes them meaningful. */
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get: () => 500,
  });
});

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

  it("dismisses on release once the drag passes the distance threshold", () => {
    const onOpenChange = vi.fn();
    render(<ControlledSheet onOpenChange={onOpenChange} />);
    const handle = document.querySelector('[data-slot="sheet-handle"]')!;

    // 200 of a 500px sheet — past the 0.25 default.
    drag(handle, 100, 300)();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("stays open when the drag passed the threshold but reversed before release", () => {
    const onOpenChange = vi.fn();
    render(<ControlledSheet onOpenChange={onOpenChange} />);
    const handle = document.querySelector('[data-slot="sheet-handle"]')!;

    // Well past the threshold, then pulled back up. Position alone still reads
    // as a dismissal, so only the release direction can refuse it.
    fireEvent.pointerDown(handle, { pointerId: 1, pointerType: "touch", clientX: 0, clientY: 100 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 0, clientY: 400 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 0, clientY: 260 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 0, clientY: 260 });

    expect(onOpenChange).not.toHaveBeenCalled();
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

  it("hands a gesture off from a scroller once it reaches the edge, without jumping", () => {
    render(<ControlledSheet />);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    const body = dialog.querySelector('[data-slot="dialog-content"]') as HTMLElement;

    // Make the body a real scroller, parked 60px down.
    body.style.overflowY = "auto";
    Object.defineProperty(body, "scrollHeight", { configurable: true, get: () => 1200 });
    Object.defineProperty(body, "clientHeight", { configurable: true, get: () => 400 });
    body.scrollTop = 60;

    const target = screen.getByRole("button", { name: "Inside" });
    fireEvent.pointerDown(target, { pointerId: 1, pointerType: "touch", clientX: 0, clientY: 100 });
    // Pulling down with scroll left above: the scroller keeps the gesture.
    fireEvent.pointerMove(target, { pointerId: 1, clientX: 0, clientY: 140 });
    expect(dialog).not.toHaveAttribute("data-dragging");

    // The list reaches its top mid-gesture. The next pull is the panel's.
    body.scrollTop = 0;
    fireEvent.pointerMove(target, { pointerId: 1, clientX: 0, clientY: 180 });
    fireEvent.pointerMove(target, { pointerId: 1, clientX: 0, clientY: 220 });

    expect(dialog).toHaveAttribute("data-dragging");
    // 120px of finger travel happened before the handoff and must not count:
    // the panel has moved only the 40px since it took over.
    expect(dialog.style.translate).toBe("0 40px");
  });

  it("never starts a drag from the backdrop, whose event target is the dialog", () => {
    render(<ControlledSheet />);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;

    drag(dialog, 100, 300)();
    expect(dialog).not.toHaveAttribute("data-dragging");
  });
});
