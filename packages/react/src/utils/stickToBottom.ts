import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { prefersReducedMotion } from "./exitTransition";

/**
 * How close to the bottom still counts as "at the live edge". Streaming
 * output lands on fractional pixel boundaries (sub-pixel line heights,
 * zoom, `field-sizing` growth), so an exact `scrollTop === max` test
 * unpins the viewport for reasons the reader never caused.
 */
const BOTTOM_THRESHOLD = 24;

export interface StickToBottomOptions {
  /** Pixels from the bottom that still count as pinned. */
  threshold?: number;
  /** Start pinned to the live edge. */
  pinned?: boolean;
  onPinnedChange?: (pinned: boolean) => void;
}

/**
 * Keeps a scroll container pinned to its own bottom edge while content
 * grows, and lets go the moment the reader scrolls away.
 *
 * Framework-free on purpose: `@kernelui-lib/elements` needs the exact same
 * behaviour, and the repo's existing precedent for that is a plain class
 * plus a thin React wrapper (see `DetailsPanelAnimator` in
 * `detailsTransition.ts`) rather than two divergent implementations.
 *
 * Pin state is derived from scroll position alone — no wheel/touch/key
 * heuristics. Every scroll this controller performs itself is flagged, so
 * any *unflagged* scroll event is by definition the reader moving, and
 * "did they end up at the bottom?" answers both the unpin (scrolled up)
 * and the re-pin (scrolled back down) case with one rule. Wheel and touch
 * listeners would only re-derive the same answer, less reliably, and would
 * miss keyboard and scrollbar-drag scrolling entirely.
 */
export class StickToBottomController {
  private readonly threshold: number;
  private readonly onPinnedChange?: (pinned: boolean) => void;
  private isPinned: boolean;
  private resizeObserver: ResizeObserver | null = null;
  /** Set while this controller is driving `scrollTop` itself, so the
   * resulting scroll event isn't mistaken for the reader moving. */
  private selfScrolling = false;
  private frame: number | null = null;

  constructor(
    private readonly viewport: HTMLElement,
    private readonly content: HTMLElement | null,
    options: StickToBottomOptions = {},
  ) {
    this.threshold = options.threshold ?? BOTTOM_THRESHOLD;
    this.isPinned = options.pinned ?? true;
    this.onPinnedChange = options.onPinnedChange;

    this.viewport.addEventListener("scroll", this.handleScroll, { passive: true });
    this.resizeObserver = new ResizeObserver(this.handleGrowth);
    this.resizeObserver.observe(this.viewport);
    if (this.content) this.resizeObserver.observe(this.content);

    if (this.isPinned) this.scrollToBottom("instant");
  }

  get pinned(): boolean {
    return this.isPinned;
  }

  /** True when the viewport is already at (or within `threshold` of) its
   * bottom edge, regardless of pin state. */
  get atBottom(): boolean {
    const { scrollHeight, clientHeight, scrollTop } = this.viewport;
    return scrollHeight - clientHeight - scrollTop <= this.threshold;
  }

  /** Pin or unpin explicitly. Pinning jumps to the live edge; the caller
   * decides whether that jump animates. */
  setPinned(next: boolean, behavior: ScrollBehavior | "instant" = "smooth") {
    if (next) this.scrollToBottom(behavior);
    this.updatePinned(next);
  }

  scrollToBottom(behavior: ScrollBehavior | "instant" = "instant") {
    const reduced = prefersReducedMotion();
    const smooth = behavior === "smooth" && !reduced;
    this.selfScrolling = true;
    // `scrollTop` for the instant case, not `scrollTo`: it's the only path
    // that needs no animation, and assigning it works in every environment
    // (including jsdom, where `Element.scrollTo` doesn't exist).
    if (smooth && typeof this.viewport.scrollTo === "function") {
      this.viewport.scrollTo({ top: this.viewport.scrollHeight, behavior: "smooth" });
    } else {
      this.viewport.scrollTop = this.viewport.scrollHeight;
    }
    // Smooth scrolling emits scroll events across many frames; clear the
    // flag only once the browser has stopped moving, or the tail of our
    // own animation reads as reader input and immediately unpins.
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      if (this.atBottom || !smooth) {
        this.selfScrolling = false;
        return;
      }
      this.awaitSettle();
    });
  }

  destroy() {
    this.viewport.removeEventListener("scroll", this.handleScroll);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  private awaitSettle() {
    let lastTop = this.viewport.scrollTop;
    const step = () => {
      const top = this.viewport.scrollTop;
      if (top === lastTop || this.atBottom) {
        this.selfScrolling = false;
        this.frame = null;
        return;
      }
      lastTop = top;
      this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  private updatePinned(next: boolean) {
    if (this.isPinned === next) return;
    this.isPinned = next;
    this.onPinnedChange?.(next);
  }

  private handleScroll = () => {
    if (this.selfScrolling) return;
    this.updatePinned(this.atBottom);
  };

  /** Content grew (or the viewport was resized). Following the live edge
   * is always instant — a smooth animation per streamed chunk would never
   * catch up with the next one. */
  private handleGrowth = () => {
    if (!this.isPinned) return;
    this.scrollToBottom("instant");
  };
}

export interface UseStickToBottomOptions extends StickToBottomOptions {
  /** Re-created when this changes; use it to re-arm after swapping the
   * scrolled content wholesale (e.g. loading a different conversation). */
  key?: unknown;
}

export interface StickToBottomApi<T extends HTMLElement = HTMLDivElement> {
  viewportRef: RefObject<T | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  pinned: boolean;
  scrollToBottom: (behavior?: ScrollBehavior | "instant") => void;
}

/** React wrapper over `StickToBottomController`. */
export function useStickToBottom<T extends HTMLElement = HTMLDivElement>(
  options: UseStickToBottomOptions = {},
): StickToBottomApi<T> {
  const { threshold, pinned: pinnedOption, onPinnedChange, key } = options;
  const viewportRef = useRef<T | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<StickToBottomController | null>(null);
  const [pinned, setPinned] = useState(pinnedOption ?? true);

  // Read through refs so a re-rendering consumer's inline callback doesn't
  // tear down and rebuild the controller (which would re-scroll on every
  // streamed chunk).
  const changeRef = useRef(onPinnedChange);
  changeRef.current = onPinnedChange;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const controller = new StickToBottomController(viewport, contentRef.current, {
      threshold,
      pinned: pinnedOption ?? true,
      onPinnedChange: (next) => {
        setPinned(next);
        changeRef.current?.(next);
      },
    });
    controllerRef.current = controller;
    setPinned(controller.pinned);
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
    // `pinnedOption` is the *initial* pin state only; changing it later
    // shouldn't rebuild the controller mid-stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold, key]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior | "instant" = "smooth") => {
    controllerRef.current?.setPinned(true, behavior);
  }, []);

  return { viewportRef, contentRef, pinned, scrollToBottom };
}
