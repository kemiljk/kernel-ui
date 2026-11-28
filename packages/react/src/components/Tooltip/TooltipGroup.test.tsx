import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tooltip } from "./Tooltip";

const popup = (text: string) => screen.getByText(text).closest("[popover]") as HTMLElement;

describe("Tooltip warm-up group", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("waits for the open delay first, then opens neighbours instantly", () => {
    render(
      <>
        <Tooltip content="Bold" render={<button type="button">B</button>} />
        <Tooltip content="Italic" render={<button type="button">I</button>} />
      </>,
    );
    const [bold, italic] = screen.getAllByRole("button");

    fireEvent.pointerEnter(bold!, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(200));
    expect(popup("Bold")).not.toHaveAttribute("data-open");
    act(() => vi.advanceTimersByTime(250));
    expect(popup("Bold")).toHaveAttribute("data-open");
    expect(popup("Bold")).not.toHaveAttribute("data-instant");

    fireEvent.pointerLeave(bold!, { pointerType: "mouse" });
    fireEvent.pointerEnter(italic!, { pointerType: "mouse" });
    expect(popup("Italic")).toHaveAttribute("data-open");
    expect(popup("Italic")).toHaveAttribute("data-instant");
  });

  it("goes cold again a while after the last tooltip closes", async () => {
    render(
      <Tooltip content="Only" render={<button type="button">O</button>} />,
    );
    const button = screen.getByRole("button");
    fireEvent.pointerEnter(button, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(450));
    fireEvent.pointerLeave(button, { pointerType: "mouse" });
    // Let the close (and its exit wait) settle, then outlast the warm window.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(popup("Only")).not.toHaveAttribute("data-open");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    fireEvent.pointerEnter(button, { pointerType: "mouse" });
    expect(popup("Only")).not.toHaveAttribute("data-instant");
  });
});
