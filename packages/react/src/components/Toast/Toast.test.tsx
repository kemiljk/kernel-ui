import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastViewport, toast } from "./Toast";

const liveToastIds: string[] = [];

function addToast(title: string | ReactNode) {
  const id = toast(title, { duration: 0 });
  liveToastIds.push(id);
  return id;
}

function prepareGesture(node: HTMLElement, width = 200) {
  Object.defineProperty(node, "offsetWidth", { configurable: true, get: () => width });
  node.setPointerCapture = vi.fn();
  node.releasePointerCapture = vi.fn();
  node.hasPointerCapture = vi.fn(() => true);
}

function pointer(
  node: HTMLElement,
  type: "pointerDown" | "pointerMove" | "pointerUp" | "pointerCancel",
  x: number,
  y = 0,
  target: HTMLElement = node,
) {
  fireEvent[type](target, { button: 0, pointerId: 1, pointerType: "touch", clientX: x, clientY: y });
}

/** A hand-driven clock for `performance.now()`, so velocity is deterministic. */
function useClock() {
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  return {
    at(ms: number) {
      now = ms;
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  for (const id of liveToastIds.splice(0)) toast.dismiss(id);
  act(() => vi.runAllTimers());
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Toast swipe", () => {
  it("tracks pointer moves directly without re-rendering ToastItem", () => {
    let titleRenders = 0;
    function Title() {
      titleRenders += 1;
      return <>Direct swipe</>;
    }

    addToast(<Title />);
    render(<ToastViewport />);
    const node = screen.getByRole("status");
    prepareGesture(node);

    pointer(node, "pointerDown", 10);
    const rendersAfterStart = titleRenders;
    pointer(node, "pointerMove", 35);
    pointer(node, "pointerMove", 50);

    expect(node.style.translate).toBe("40px var(--y)");
    expect(titleRenders).toBe(rendersAfterStart);
    expect(node.style.getPropertyValue("--swipe-amount")).toBe("");
  });

  it("springs back below the distance and velocity thresholds, then returns translate to CSS", async () => {
    const clock = useClock();
    addToast("Snap back");
    render(<ToastViewport />);
    const node = screen.getByRole("status");
    prepareGesture(node);

    pointer(node, "pointerDown", 0);
    clock.at(200);
    pointer(node, "pointerMove", 30);
    clock.at(400);
    pointer(node, "pointerUp", 30);

    expect(node).not.toHaveAttribute("data-dragging");
    expect(node.style.translate).toBe("0px var(--y)");

    await act(async () => {
      vi.runAllTimers();
      await Promise.resolve();
    });
    expect(node.style.translate).toBe("");
  });

  it("dismisses on distance and continues the exit toward the edge", () => {
    const clock = useClock();
    addToast("Dismiss on distance");
    render(<ToastViewport />);
    const node = screen.getByRole("status");
    prepareGesture(node);

    // 100px of a 200px toast, slowly: past 40%, nowhere near a flick.
    pointer(node, "pointerDown", 0);
    clock.at(400);
    pointer(node, "pointerMove", 100);
    clock.at(800);
    pointer(node, "pointerUp", 100);

    expect(node).not.toHaveAttribute("data-dragging");
    expect(node).toHaveAttribute("data-closing");
    expect(node.style.translate).toBe("300px var(--y)");
  });

  it("dismisses a short flick on velocity alone", () => {
    const clock = useClock();
    addToast("Flick");
    render(<ToastViewport />);
    const node = screen.getByRole("status");
    prepareGesture(node);

    // 40px in 40ms = 1px/ms: well past the 0.5px/ms bar, only 20% travelled.
    pointer(node, "pointerDown", 0);
    clock.at(20);
    pointer(node, "pointerMove", 20);
    clock.at(40);
    pointer(node, "pointerMove", 40);
    pointer(node, "pointerUp", 40);

    expect(node).toHaveAttribute("data-closing");
  });

  it("keeps the toast when the pointer is pulling back at release", () => {
    const clock = useClock();
    addToast("Reversal");
    render(<ToastViewport />);
    const node = screen.getByRole("status");
    prepareGesture(node);

    pointer(node, "pointerDown", 0);
    clock.at(300);
    pointer(node, "pointerMove", 140);
    clock.at(340);
    pointer(node, "pointerMove", 110);
    clock.at(360);
    pointer(node, "pointerUp", 100);

    expect(node).not.toHaveAttribute("data-closing");
  });

  it("rubber-bands a swipe away from the edge and never dismisses it", () => {
    const clock = useClock();
    addToast("Wrong way");
    render(<ToastViewport />);
    const node = screen.getByRole("status");
    prepareGesture(node);

    pointer(node, "pointerDown", 0);
    clock.at(20);
    pointer(node, "pointerMove", -100);
    const x = parseFloat(node.style.translate);
    expect(x).toBeLessThan(0);
    expect(x).toBeGreaterThan(-100 * 0.55);

    clock.at(40);
    pointer(node, "pointerUp", -200);
    expect(node).not.toHaveAttribute("data-closing");
  });

  it("leaves a press on the close button to the button", () => {
    addToast("Button press");
    render(<ToastViewport />);
    const node = screen.getByRole("status");
    prepareGesture(node);
    const button = screen.getByRole("button", { name: "Dismiss" });

    pointer(node, "pointerDown", 0, 0, button);
    pointer(node, "pointerMove", 120, 0, button);

    expect(node.setPointerCapture).not.toHaveBeenCalled();
    expect(node).not.toHaveAttribute("data-dragging");
    expect(node.style.translate).toBe("");
  });

  it("does not claim a mostly vertical drag", () => {
    addToast("Vertical");
    render(<ToastViewport />);
    const node = screen.getByRole("status");
    prepareGesture(node);

    pointer(node, "pointerDown", 0, 0);
    pointer(node, "pointerMove", 3, 30);
    pointer(node, "pointerMove", 80, 40);

    expect(node).not.toHaveAttribute("data-dragging");
    expect(node.style.translate).toBe("");
  });

  it("preserves the live X offset when another toast is inserted mid-drag", () => {
    addToast("First toast");
    render(<ToastViewport />);
    const first = screen.getByRole("status");
    prepareGesture(first);

    pointer(first, "pointerDown", 0);
    pointer(first, "pointerMove", 36);
    expect(first.style.translate).toBe("36px var(--y)");

    act(() => {
      addToast("Second toast");
    });

    expect(screen.getByText("First toast").closest('[role="status"]')).toBe(first);
    expect(first.style.translate).toBe("36px var(--y)");
  });

  it("cancels without dismissing and clears gesture residue", async () => {
    addToast("Cancelled swipe");
    render(<ToastViewport />);
    const node = screen.getByRole("status");
    prepareGesture(node);

    pointer(node, "pointerDown", 0);
    pointer(node, "pointerMove", 100);
    pointer(node, "pointerCancel", 100);

    expect(node).not.toHaveAttribute("data-dragging");
    expect(node).not.toHaveAttribute("data-closing");

    await act(async () => {
      vi.runAllTimers();
      await Promise.resolve();
    });
    expect(node.style.translate).toBe("");
  });
});
