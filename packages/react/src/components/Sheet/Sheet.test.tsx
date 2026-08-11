import { cleanup as cleanupRender, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { VelocityTracker } from "../../utils/sheetDrag";
import { Sheet, type SheetProps, type SheetSide } from "./Sheet";

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

  it("splits the content wrapper into a scrolling body and a pinned footer", () => {
    render(<ControlledSheet footer={<button type="button">Checkout</button>} />);
    const content = screen.getByRole("dialog").querySelector('[data-slot="dialog-content"]')!;
    const parts = Array.from(content.children).map((el) => el.getAttribute("data-slot"));

    // The handle comes first but is positioned, not flowed; the footer must come
    // after the body or it would scroll away with the content.
    expect(parts).toEqual(["sheet-handle", "sheet-body", "sheet-footer"]);
    expect(screen.getByRole("button", { name: "Inside" }).closest('[data-slot="sheet-body"]')).not.toBeNull();
  });

  it("omits the footer slot entirely when no footer is given", () => {
    render(<ControlledSheet />);
    expect(document.querySelector('[data-slot="sheet-footer"]')).toBeNull();
    expect(document.querySelector('[data-slot="sheet-body"]')).not.toBeNull();
  });

  it("lets handleOnly drags start from the footer, which is chrome too", () => {
    render(<ControlledSheet handleOnly footer={<button type="button">Checkout</button>} />);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;

    drag(screen.getByRole("button", { name: "Checkout" }), 100, 200);
    expect(dialog).toHaveAttribute("data-dragging");
  });

  it("marks the root when inset, since the variant is entirely CSS", () => {
    const { rerender } = render(<ControlledSheet />);
    const before = screen.getByRole("dialog").className;
    rerender(<ControlledSheet inset />);
    const after = screen.getByRole("dialog").className;
    expect(after).not.toBe(before);
    expect(after.split(" ").length).toBe(before.split(" ").length + 1);
  });

  it("closes itself when the viewport is wider than maxDisplayWidth", () => {
    const onOpenChange = vi.fn();
    // jsdom's default is 1024, so this sheet is already over its limit on open.
    render(<ControlledSheet maxDisplayWidth={768} onOpenChange={onOpenChange} />);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("stays open below maxDisplayWidth until the window grows past it", () => {
    const onOpenChange = vi.fn();
    window.innerWidth = 600;
    render(<ControlledSheet maxDisplayWidth={768} onOpenChange={onOpenChange} />);
    expect(onOpenChange).not.toHaveBeenCalled();

    window.innerWidth = 900;
    fireEvent(window, new Event("resize"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    window.innerWidth = 1024;
  });

  describe("snap points", () => {
    // 900px viewport, so [25, 55, 92] is [225, 495, 828].
    const SNAPS = [25, 55, 92];

    /** The engine reads the painted height, which jsdom won't compute, so
     * `getBoundingClientRect` is stubbed to resolve the inline height the way a
     * browser would — including turning `dvh` into pixels, which is the whole
     * reason the engine measures rather than parsing the style itself. */
    function trackInlineHeight(dialog: HTMLElement) {
      Object.defineProperty(dialog, "getBoundingClientRect", {
        configurable: true,
        value: () => {
          const raw = dialog.style.height;
          const value = parseFloat(raw);
          if (!Number.isFinite(value)) return { height: 0 } as DOMRect;
          const height = raw.endsWith("dvh") ? (value / 100) * window.innerHeight : value;
          return { height } as DOMRect;
        },
      });
    }

    /** Drives a gesture with a clock we control, since velocity is the whole
     * point of these cases and jsdom's timers advance by nothing. */
    function gesture(el: Element, steps: [y: number, atMs: number][]) {
      const now = vi.spyOn(performance, "now");
      let i = 0;
      now.mockImplementation(() => steps[Math.min(i, steps.length - 1)]![1]);
      fireEvent.pointerDown(el, { pointerId: 1, pointerType: "touch", clientY: steps[0]![0] });
      for (i = 1; i < steps.length; i++) {
        fireEvent.pointerMove(el, { pointerId: 1, clientY: steps[i]![0] });
      }
      i = steps.length - 1;
      fireEvent.pointerUp(el, { pointerId: 1, clientY: steps[steps.length - 1]![0] });
      now.mockRestore();
    }

    function openSheet(props: Partial<SheetProps> = {}) {
      window.innerHeight = 900;
      render(<ControlledSheet snapPoints={SNAPS} {...props} />);
      const dialog = screen.getByRole("dialog") as HTMLDialogElement;
      trackInlineHeight(dialog);
      return { dialog, handle: document.querySelector('[data-slot="sheet-handle"]')! };
    }

    it("opens at the tallest snap, and honours defaultSnap for a peek", () => {
      const { dialog } = openSheet();
      expect(dialog.style.height).toBe("92dvh");

      cleanupRender();
      const peek = openSheet({ defaultSnap: 25 });
      expect(peek.dialog.style.height).toBe("25dvh");
    });

    it("drives height while dragging, not translate", () => {
      const { dialog, handle } = openSheet();
      fireEvent.pointerDown(handle, { pointerId: 1, pointerType: "touch", clientY: 100 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 400 });

      // 828 - 300 of travel, still inside the snap range.
      expect(dialog.style.height).toBe("528px");
      expect(dialog.style.translate).toBe("");
    });

    it("lands on the nearest snap when released slowly", () => {
      const onSnapChange = vi.fn();
      // `spring={false}` so the landing height is written synchronously; the
      // spring's own arrival is covered separately.
      const { dialog, handle } = openSheet({ onSnapChange, spring: false });
      // 828 → ~500 over 400ms: 0.8px/ms of travel but only 0.06 in the last
      // window, so this is a drop, not a flick.
      gesture(handle, [
        [100, 0],
        [300, 200],
        [420, 380],
        [428, 400],
      ]);
      expect(onSnapChange).toHaveBeenCalledWith(55);
      expect(dialog.style.height).toBe("55dvh");
    });

    it("steps exactly one snap on a flick, rather than to the nearest", () => {
      const onSnapChange = vi.fn();
      const { dialog, handle } = openSheet({ defaultSnap: 55, onSnapChange, spring: false });
      // Only 60px of travel, so the nearest snap is still 55 — but it leaves at
      // 3px/ms, and a flick is supposed to step regardless of distance.
      gesture(handle, [
        [100, 0],
        [130, 10],
        [160, 20],
      ]);
      expect(onSnapChange).toHaveBeenCalledWith(25);
      expect(dialog.style.height).toBe("25dvh");
    });

    it("carries the release speed into the settle when springing", () => {
      const onSnapChange = vi.fn();
      const { dialog, handle } = openSheet({ defaultSnap: 55, onSnapChange });
      gesture(handle, [
        [100, 0],
        [130, 10],
        [160, 20],
      ]);
      // The spring owns the height frame by frame, so the landing snap is
      // reported immediately while the height is still in transit — in px, not
      // yet handed back to dvh.
      expect(onSnapChange).toHaveBeenCalledWith(25);
      expect(dialog.style.height).toMatch(/px$/);
      expect(dialog).not.toHaveAttribute("data-snapping");
    });

    it("dismisses when a downward flick runs out of snaps below", () => {
      const onOpenChange = vi.fn();
      const { handle } = openSheet({ defaultSnap: 25, onOpenChange });
      gesture(handle, [
        [100, 0],
        [130, 10],
        [160, 20],
      ]);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("resists past the tallest snap instead of tracking the finger", () => {
      const { dialog, handle } = openSheet();
      fireEvent.pointerDown(handle, { pointerId: 1, pointerType: "touch", clientY: 400 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 100 });

      // 300px of upward pull past a 828px snap, damped well short of 1128.
      const height = parseFloat(dialog.style.height);
      expect(height).toBeGreaterThan(828);
      expect(height).toBeLessThan(1000);
    });

    it("snaps the axis the sheet grows along, on every side", () => {
      // A snap is "how much of the screen this takes up", so the side decides
      // which property and unit express it. Asserting `style.height === ""` for a
      // left/right sheet would pass whether snaps worked or not — the property
      // that matters is `width` — so both are checked each time.
      const cases = [
        { side: "bottom", prop: "height", other: "width", unit: "dvh" },
        { side: "top", prop: "height", other: "width", unit: "dvh" },
        { side: "left", prop: "width", other: "height", unit: "dvw" },
        { side: "right", prop: "width", other: "height", unit: "dvw" },
      ] as const satisfies readonly {
        side: SheetSide;
        prop: "height" | "width";
        other: "height" | "width";
        unit: string;
      }[];

      for (const { side, prop, other, unit } of cases) {
        cleanupRender();
        render(<ControlledSheet snapPoints={SNAPS} side={side} />);
        const dialog = screen.getByRole("dialog") as HTMLElement;
        expect(dialog.style[prop], `${side} sizes its own axis`).toBe(`92${unit}`);
        expect(dialog.style[other], `${side} leaves the cross axis alone`).toBe("");
        // The hook that lifts the stylesheet's size cap, without which a snap
        // above the cap is silently clamped to it.
        expect(dialog.dataset.snap, `${side} reflects its snap`).toBe("92");
      }
    });

    it("clears the old axis when the side changes under it", () => {
      window.innerHeight = 900;
      const { rerender } = render(<ControlledSheet snapPoints={SNAPS} side="bottom" />);
      const dialog = screen.getByRole("dialog") as HTMLElement;
      expect(dialog.style.height).toBe("92dvh");

      // A snap left on the axis the sheet no longer grows along keeps applying,
      // so a bottom-to-left switch would stay pinned to 92dvh tall.
      rerender(<ControlledSheet snapPoints={SNAPS} side="left" />);
      expect(dialog.style.width).toBe("92dvw");
      expect(dialog.style.height).toBe("");
    });

    it("drops the snap hook when a sheet has no snap points", () => {
      window.innerHeight = 900;
      render(<ControlledSheet />);
      const dialog = screen.getByRole("dialog") as HTMLElement;
      expect(dialog.dataset.snap).toBeUndefined();
      expect(dialog.style.height).toBe("");
      expect(dialog.style.width).toBe("");
    });
  });

  it("never starts a drag from the backdrop, whose event target is the dialog", () => {
    render(<ControlledSheet />);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;

    drag(dialog, 100, 300)();
    expect(dialog).not.toHaveAttribute("data-dragging");
  });
});
