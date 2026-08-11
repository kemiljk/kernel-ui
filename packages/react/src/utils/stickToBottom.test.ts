import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StickToBottomController } from "./stickToBottom";

/** jsdom has no layout, so the viewport's scroll geometry is faked: the three
 * properties the controller actually reads, plus a `scrollTo` that moves
 * `scrollTop` and fires a scroll event the way a real browser would. */
function makeViewport(scrollHeight = 1000, clientHeight = 200) {
  const el = document.createElement("div");
  let scrollTop = 0;
  Object.defineProperty(el, "scrollHeight", { get: () => scrollHeight, configurable: true });
  Object.defineProperty(el, "clientHeight", { get: () => clientHeight, configurable: true });
  Object.defineProperty(el, "scrollTop", {
    get: () => scrollTop,
    set: (next: number) => {
      // Browsers clamp; so must the fake, or "scroll to scrollHeight" would
      // read back as a position past the bottom.
      scrollTop = Math.max(0, Math.min(next, scrollHeight - clientHeight));
    },
    configurable: true,
  });
  el.scrollTo = ((options: ScrollToOptions) => {
    scrollTop = Math.min(options.top ?? 0, scrollHeight - clientHeight);
    el.dispatchEvent(new Event("scroll"));
  }) as typeof el.scrollTo;

  return {
    el,
    /** Scroll as the reader would: move, then emit an unflagged event. */
    readerScrollTo(top: number) {
      scrollTop = top;
      el.dispatchEvent(new Event("scroll"));
    },
    grow(by: number) {
      scrollHeight += by;
    },
    get top() {
      return scrollTop;
    },
  };
}

let observers: Array<() => void> = [];

beforeEach(() => {
  observers = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private readonly callback: () => void) {
        observers.push(() => this.callback());
      }
      observe() {}
      disconnect() {}
    },
  );
  // Deterministic frames: the controller's settle loop runs on rAF.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Fires every observed ResizeObserver, as growth would. */
function flushGrowth() {
  for (const notify of observers) notify();
}

describe("StickToBottomController", () => {
  it("starts at the live edge when pinned", () => {
    const viewport = makeViewport();
    const controller = new StickToBottomController(viewport.el, null);
    expect(controller.pinned).toBe(true);
    expect(viewport.top).toBe(800);
    controller.destroy();
  });

  it("does not scroll when it starts unpinned", () => {
    const viewport = makeViewport();
    const controller = new StickToBottomController(viewport.el, null, { pinned: false });
    expect(viewport.top).toBe(0);
    controller.destroy();
  });

  it("unpins when the reader scrolls away, and re-pins at the bottom", () => {
    const viewport = makeViewport();
    const onPinnedChange = vi.fn();
    const controller = new StickToBottomController(viewport.el, null, { onPinnedChange });

    viewport.readerScrollTo(300);
    expect(controller.pinned).toBe(false);
    expect(onPinnedChange).toHaveBeenLastCalledWith(false);

    viewport.readerScrollTo(800);
    expect(controller.pinned).toBe(true);
    expect(onPinnedChange).toHaveBeenLastCalledWith(true);

    controller.destroy();
  });

  it("treats anything within the threshold of the bottom as pinned", () => {
    const viewport = makeViewport();
    const controller = new StickToBottomController(viewport.el, null, { threshold: 50 });
    viewport.readerScrollTo(760); // 40px from the bottom
    expect(controller.pinned).toBe(true);
    viewport.readerScrollTo(700); // 100px from the bottom
    expect(controller.pinned).toBe(false);
    controller.destroy();
  });

  it("follows growing content while pinned, and leaves it alone once unpinned", () => {
    const viewport = makeViewport();
    const controller = new StickToBottomController(viewport.el, null);

    viewport.grow(500);
    flushGrowth();
    expect(viewport.top).toBe(1300);

    viewport.readerScrollTo(400);
    viewport.grow(500);
    flushGrowth();
    expect(viewport.top).toBe(400);

    controller.destroy();
  });

  it("does not mistake its own scroll for the reader moving", () => {
    const viewport = makeViewport();
    const onPinnedChange = vi.fn();
    const controller = new StickToBottomController(viewport.el, null, {
      pinned: false,
      onPinnedChange,
    });

    controller.setPinned(true, "instant");
    expect(controller.pinned).toBe(true);
    expect(onPinnedChange).toHaveBeenCalledTimes(1);
    expect(onPinnedChange).toHaveBeenCalledWith(true);

    controller.destroy();
  });

  it("stops listening after destroy", () => {
    const viewport = makeViewport();
    const onPinnedChange = vi.fn();
    const controller = new StickToBottomController(viewport.el, null, { onPinnedChange });
    controller.destroy();
    viewport.readerScrollTo(0);
    expect(onPinnedChange).not.toHaveBeenCalled();
  });
});
