import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Resizable } from "./Resizable";

function preparePointerCapture(separator: HTMLElement) {
  let capturedPointer: number | null = null;
  separator.setPointerCapture = vi.fn((pointerId) => {
    capturedPointer = pointerId;
  });
  separator.hasPointerCapture = vi.fn((pointerId) => capturedPointer === pointerId);
  separator.releasePointerCapture = vi.fn((pointerId) => {
    if (capturedPointer === pointerId) capturedPointer = null;
  });
}

function setRect(element: HTMLElement, width = 1000, height = 500) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    right: width,
    bottom: height,
    left: 0,
    width,
    height,
    toJSON: () => ({}),
  });
}

describe("Resizable", () => {
  it("updates the live split without rendering on pointermove, then commits on release", () => {
    const className = vi.fn(() => "resizable-test");
    render(
      <Resizable className={className}>
        <div>Navigation</div>
        <div>Content</div>
      </Resizable>,
    );

    const separator = screen.getByRole("separator");
    const root = separator.parentElement as HTMLElement;
    preparePointerCapture(separator);
    setRect(root);

    const initialRenders = className.mock.calls.length;
    fireEvent.pointerDown(separator, { pointerId: 7, clientX: 500, clientY: 0 });
    const rendersAfterStart = className.mock.calls.length;
    expect(rendersAfterStart).toBe(initialRenders + 1);

    fireEvent.pointerMove(separator, { pointerId: 7, clientX: 600, clientY: 0 });
    expect(root.style.getPropertyValue("--kernel-resizable-split")).toBe("60%");
    expect(separator).toHaveAttribute("aria-valuenow", "60");

    fireEvent.pointerMove(separator, { pointerId: 7, clientX: 735, clientY: 0 });
    expect(root.style.getPropertyValue("--kernel-resizable-split")).toBe("73.5%");
    expect(separator).toHaveAttribute("aria-valuenow", "74");
    expect(className).toHaveBeenCalledTimes(rendersAfterStart);

    fireEvent.pointerUp(separator, { pointerId: 7, clientX: 735, clientY: 0 });
    expect(className).toHaveBeenCalledTimes(rendersAfterStart + 1);
    expect(root.style.getPropertyValue("--kernel-resizable-split")).toBe("73.5%");
    expect(separator).toHaveAttribute("aria-valuenow", "74");
  });

  it("commits on pointercancel and restores document drag styles", () => {
    render(
      <Resizable>
        <div>Navigation</div>
        <div>Content</div>
      </Resizable>,
    );

    const separator = screen.getByRole("separator");
    const root = separator.parentElement as HTMLElement;
    preparePointerCapture(separator);
    setRect(root);

    fireEvent.pointerDown(separator, { pointerId: 3, clientX: 500, clientY: 0 });
    fireEvent.pointerMove(separator, { pointerId: 3, clientX: 650, clientY: 0 });
    expect(document.body.style.cursor).toBe("col-resize");
    expect(document.body.style.userSelect).toBe("none");

    fireEvent.pointerCancel(separator, { pointerId: 3, clientX: 650, clientY: 0 });
    expect(root).not.toHaveAttribute("data-dragging");
    expect(root.style.getPropertyValue("--kernel-resizable-split")).toBe("65%");
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");
  });

  it("keeps keyboard changes instant and clamped", () => {
    render(
      <Resizable defaultSplit={50} min={30} max={70} orientation="vertical">
        <div>Top</div>
        <div>Bottom</div>
      </Resizable>,
    );

    const separator = screen.getByRole("separator");
    fireEvent.keyDown(separator, { key: "ArrowDown" });
    expect(separator).toHaveAttribute("aria-valuenow", "52");
    fireEvent.keyDown(separator, { key: "ArrowUp", shiftKey: true });
    expect(separator).toHaveAttribute("aria-valuenow", "42");
    fireEvent.keyDown(separator, { key: "Home" });
    expect(separator).toHaveAttribute("aria-valuenow", "30");
    fireEvent.keyDown(separator, { key: "ArrowUp", shiftKey: true });
    expect(separator).toHaveAttribute("aria-valuenow", "30");
    fireEvent.keyDown(separator, { key: "End" });
    expect(separator).toHaveAttribute("aria-valuenow", "70");
  });
});
