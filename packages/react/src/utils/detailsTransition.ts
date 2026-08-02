import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { prefersReducedMotion } from "./exitTransition";

function parseCssMs(value: string, fallback: number): number {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.endsWith("ms")) return parseFloat(trimmed) || fallback;
  return (parseFloat(trimmed) || fallback / 1000) * 1000;
}

function motionTokens(node: HTMLElement, opening: boolean) {
  const style = getComputedStyle(node);
  const durationToken = opening ? "--kernel-duration-enter" : "--kernel-duration-exit";
  const durationMs = parseCssMs(
    style.getPropertyValue(durationToken),
    opening ? 200 : 150,
  );
  const easing = style.getPropertyValue("--kernel-ease-out").trim() || "ease-out";
  return { durationMs, easing };
}

/**
 * The panel's animated box. Padding travels with the height because
 * `box-sizing: border-box` refuses to shrink a box below its own padding —
 * leave the panel's `padding-block-end` alone and `height: 0` still renders
 * as a padding-tall sliver, so every open starts with a visible pop.
 */
interface PanelBox {
  height: number;
  paddingTop: string;
  paddingBottom: string;
}

const COLLAPSED: PanelBox = { height: 0, paddingTop: "0px", paddingBottom: "0px" };

function lockPanel(content: HTMLElement, box: PanelBox) {
  content.style.overflow = "clip";
  content.style.height = `${box.height}px`;
  content.style.paddingTop = box.paddingTop;
  content.style.paddingBottom = box.paddingBottom;
}

function clearPanelStyles(content: HTMLElement) {
  content.style.removeProperty("height");
  content.style.removeProperty("padding-top");
  content.style.removeProperty("padding-bottom");
  content.style.removeProperty("overflow");
}

/** The panel's current rendered box, including any in-flight animated values. */
function readPanel(content: HTMLElement): PanelBox {
  const style = getComputedStyle(content);
  return {
    height: content.getBoundingClientRect().height,
    paddingTop: style.paddingTop,
    paddingBottom: style.paddingBottom,
  };
}

/**
 * The panel's natural box. Flipping to `auto` to measure is safe: style writes
 * and layout reads inside one task never paint an intermediate frame. `auto`
 * is used rather than `scrollHeight` because engines disagree on whether
 * `scrollHeight` includes bottom padding once the content overflows.
 */
function measurePanel(content: HTMLElement): PanelBox {
  const previousHeight = content.style.height;
  const previousPaddingTop = content.style.paddingTop;
  const previousPaddingBottom = content.style.paddingBottom;
  const previousOverflow = content.style.overflow;
  content.style.overflow = "clip";
  content.style.height = "auto";
  content.style.removeProperty("padding-top");
  content.style.removeProperty("padding-bottom");
  const natural = readPanel(content);
  content.style.height = previousHeight;
  content.style.paddingTop = previousPaddingTop;
  content.style.paddingBottom = previousPaddingBottom;
  content.style.overflow = previousOverflow;
  return natural;
}

function panelKeyframes(from: PanelBox, to: PanelBox): Keyframe[] {
  return [
    {
      height: `${from.height}px`,
      paddingTop: from.paddingTop,
      paddingBottom: from.paddingBottom,
    },
    { height: `${to.height}px`, paddingTop: to.paddingTop, paddingBottom: to.paddingBottom },
  ];
}

export interface DetailsPanelAnimatorOptions {
  onOpenChange?: (open: boolean) => void;
}

/**
 * Cross-browser measured-height open/close for `<details>` panels, animating
 * the inner content wrapper via WAAPI so Chromium, Safari and Firefox share
 * one smooth path.
 *
 * Driven from `click` on the `<summary>`, not from `toggle`. `toggle` is
 * dispatched from a queued task *after* the open state has already flipped,
 * and it is not cancelable — intercepting it there lets the browser paint one
 * full-height frame before any JS runs, which is exactly the flash this
 * exists to remove. `click` is cancelable and covers keyboard activation too,
 * since Enter/Space on a `<summary>` dispatches a synthetic click.
 */
export class DetailsPanelAnimator {
  private animation: Animation | null = null;
  private animatingOpen: boolean | null = null;
  /** Bumped by every state request; a run that finds it changed was superseded. */
  private generation = 0;
  /** The open state we last set ourselves, so the `toggle` listener can tell
   *  our own changes apart from find-in-page or devtools opening the panel. */
  private expectedOpen: boolean | null = null;
  private readonly handleClick: (event: MouseEvent) => void;
  private readonly handleToggle: () => void;

  constructor(
    private readonly details: HTMLDetailsElement,
    private readonly content: HTMLElement,
    private readonly options: DetailsPanelAnimatorOptions = {},
  ) {
    this.handleClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const summary = this.details.querySelector(":scope > summary");
      if (!summary || !(event.target instanceof Node)) return;
      if (!summary.contains(event.target)) return;
      event.preventDefault();
      const next =
        this.animatingOpen !== null ? !this.animatingOpen : !this.details.open;
      void this.setOpen(next);
    };

    this.handleToggle = () => {
      if (this.expectedOpen === this.details.open) {
        this.expectedOpen = null;
        return;
      }
      this.snapOpen(this.details.open);
    };

    this.details.addEventListener("click", this.handleClick);
    this.details.addEventListener("toggle", this.handleToggle);
  }

  destroy() {
    this.generation += 1;
    this.animation?.cancel();
    this.animation = null;
    this.animatingOpen = null;
    clearPanelStyles(this.content);
    this.details.removeEventListener("click", this.handleClick);
    this.details.removeEventListener("toggle", this.handleToggle);
  }

  snapOpen(open: boolean) {
    this.generation += 1;
    this.animation?.cancel();
    this.animation = null;
    this.animatingOpen = null;
    clearPanelStyles(this.content);
    this.setNativeOpen(open);
    this.details.removeAttribute("data-state");
    this.options.onOpenChange?.(open);
  }

  setOpen(nextOpen: boolean): Promise<void> {
    return this.animateTo(nextOpen);
  }

  private setNativeOpen(open: boolean) {
    if (this.details.open === open) return;
    this.expectedOpen = open;
    this.details.open = open;
  }

  private waitAnimation(animation: Animation): Promise<void> {
    return new Promise((resolve) => {
      const finish = () => {
        animation.removeEventListener("finish", finish);
        animation.removeEventListener("cancel", finish);
        resolve();
      };
      animation.addEventListener("finish", finish);
      animation.addEventListener("cancel", finish);
    });
  }

  /** Releases the panel back to its natural box. Cancelling matters: a
   *  finished `fill: "forwards"` animation keeps overriding the element's own
   *  styles, pinning the panel to whatever height it was measured at. */
  private settle(open: boolean) {
    this.animation?.cancel();
    this.animation = null;
    this.animatingOpen = null;
    this.setNativeOpen(open);
    clearPanelStyles(this.content);
    this.details.removeAttribute("data-state");
    this.options.onOpenChange?.(open);
  }

  private async animateTo(nextOpen: boolean) {
    if (this.animatingOpen !== null) {
      if (this.animatingOpen === nextOpen) return;
    } else if (this.details.open === nextOpen) {
      return;
    }

    if (prefersReducedMotion()) {
      this.snapOpen(nextOpen);
      return;
    }

    const token = (this.generation += 1);
    // Only trust a measured box while the panel is actually revealed. A closed
    // `::details-content` is `content-visibility: hidden`, which *retains* its
    // subtree's geometry instead of zeroing it, so a closed panel still reports
    // its full height — read that as the start and the open run has nowhere to
    // travel. `details.open` stays true for the whole of our own close
    // animation, so interruptions still measure their real current box.
    const from = this.details.open ? readPanel(this.content) : COLLAPSED;
    this.animation?.cancel();
    this.animation = null;

    // Everything from here to `animate()` runs synchronously, so the panel is
    // already clamped to its start box by the time the browser paints the
    // now-open `<details>`.
    this.animatingOpen = nextOpen;
    this.details.setAttribute("data-state", nextOpen ? "opening" : "closing");
    this.setNativeOpen(true);
    lockPanel(this.content, from);

    const to = nextOpen ? measurePanel(this.content) : COLLAPSED;
    const distance = Math.abs(to.height - from.height);
    if (distance < 1) {
      this.settle(nextOpen);
      return;
    }

    const { durationMs, easing } = motionTokens(this.details, nextOpen);
    this.animation = this.content.animate(panelKeyframes(from, to), {
      // Scaled so reversing mid-flight covers the shorter remaining distance
      // at the same speed instead of crawling through a full-length run.
      duration: durationMs * (distance / Math.max(to.height, from.height)),
      easing,
      fill: "forwards",
    });

    await this.waitAnimation(this.animation);
    if (token !== this.generation) return;
    this.settle(nextOpen);
  }
}

export interface UseDetailsTransitionOptions {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function useDetailsTransition({
  defaultOpen = false,
  open: openProp,
  onOpenChange,
}: UseDetailsTransitionOptions = {}) {
  const isControlled = openProp !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = isControlled ? openProp : uncontrolledOpen;
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animatorRef = useRef<DetailsPanelAnimator | null>(null);
  const didInit = useRef(false);
  const isControlledRef = useRef(isControlled);
  const onOpenChangeRef = useRef(onOpenChange);
  isControlledRef.current = isControlled;
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    const details = detailsRef.current;
    const content = contentRef.current;
    if (!details || !content) return;

    const animator = new DetailsPanelAnimator(details, content, {
      onOpenChange: (next) => {
        if (!isControlledRef.current) setUncontrolledOpen(next);
        onOpenChangeRef.current?.(next);
      },
    });
    animatorRef.current = animator;

    if (!didInit.current) {
      didInit.current = true;
      if (defaultOpen) animator.snapOpen(true);
    }

    return () => {
      animator.destroy();
      animatorRef.current = null;
    };
  }, [defaultOpen]);

  useEffect(() => {
    if (!isControlled || openProp === undefined) return;
    void animatorRef.current?.setOpen(openProp);
  }, [isControlled, openProp]);

  const setOpen = useCallback((next: boolean) => {
    void animatorRef.current?.setOpen(next);
  }, []);

  return { detailsRef, contentRef, open, setOpen } satisfies {
    detailsRef: RefObject<HTMLDetailsElement | null>;
    contentRef: RefObject<HTMLDivElement | null>;
    open: boolean;
    setOpen: (next: boolean) => void;
  };
}
