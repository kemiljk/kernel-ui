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

function pointer(node: HTMLElement, type: "pointerDown" | "pointerMove" | "pointerUp" | "pointerCancel", x: number) {
  fireEvent[type](node, { button: 0, pointerId: 1, pointerType: "touch", clientX: x });
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
    vi.spyOn(performance, "now").mockReturnValueOnce(0).mockReturnValueOnce(200);
    addToast("Snap back");
    render(<ToastViewport />);
    const node = screen.getByRole("status");
    prepareGesture(node);

    pointer(node, "pointerDown", 0);
    pointer(node, "pointerMove", 30);
    pointer(node, "pointerUp", 30);

    expect(node).not.toHaveAttribute("data-dragging");
    expect(node.style.translate).toBe("0px var(--y)");

    await act(async () => {
      vi.runAllTimers();
      await Promise.resolve();
    });
    expect(node.style.translate).toBe("");
  });

  it.each([
    ["right", 100, "300px var(--y)"],
    ["left", -100, "-300px var(--y)"],
  ] as const)("continues a %s dismissal in the swipe direction", (_direction, x, expected) => {
    vi.spyOn(performance, "now").mockReturnValueOnce(0).mockReturnValueOnce(200);
    addToast(`Dismiss ${_direction}`);
    render(<ToastViewport />);
    const node = screen.getByRole("status");
    prepareGesture(node);

    pointer(node, "pointerDown", 0);
    pointer(node, "pointerMove", x);
    pointer(node, "pointerUp", x);

    expect(node).not.toHaveAttribute("data-dragging");
    expect(node).toHaveAttribute("data-closing");
    expect(node.style.translate).toBe(expected);
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
