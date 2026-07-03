import { useEffect, useId, useRef } from "react";

export type FloatingPlacement = "top" | "bottom" | "left" | "right";

export interface UseFloatingPositionOptions {
  open: boolean;
  placement?: FloatingPlacement;
  /** Gap between the anchor and the floating element, in pixels. */
  offset?: number;
}

const supportsAnchorPositioning =
  typeof CSS !== "undefined" && CSS.supports("anchor-name: --kernel-support-check");

/** The floating element should scale in from wherever its anchor
 * actually sits, not from an assumed side/alignment — this measures
 * both rects and expresses the anchor's center as a percentage of the
 * floating box, the same approach Radix/Base UI use for their own
 * `transform-origin` CSS variables. Unlike a static "top center"-style
 * keyword, this stays correct regardless of the panel's alignment
 * (start/center/end) and self-corrects if `position-try-fallbacks`
 * flips the placement to the opposite side. */
function computeTransformOrigin(anchorRect: DOMRect, floatingRect: DOMRect): string {
  if (floatingRect.width === 0 || floatingRect.height === 0) return "center";
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  const x = clamp(((anchorRect.left + anchorRect.width / 2 - floatingRect.left) / floatingRect.width) * 100);
  const y = clamp(((anchorRect.top + anchorRect.height / 2 - floatingRect.top) / floatingRect.height) * 100);
  return `${x}% ${y}%`;
}

/**
 * Positions a floating element (a tooltip, popover, or menu) relative to
 * its anchor. CSS anchor positioning (`anchor-name`/`position-anchor`/
 * `position-area`) does the actual work wherever it's supported, no
 * JavaScript recalculates a position on every scroll or resize. Where
 * it isn't supported yet, this falls back to a `getBoundingClientRect`
 * calculation kept in sync on scroll and resize, this is the one
 * deliberate JavaScript fallback in the floating-content components,
 * for browsers that don't have the native mechanism yet yet.
 *
 * Both the anchor and the floating element need `ref` attached to the
 * refs this returns. The floating element must have `position: fixed`
 * in its own stylesheet (both code paths assume viewport-relative
 * coordinates), and should reference
 * `transform-origin: var(--kernel-transform-origin, center)` in its own
 * CSS — this hook writes that custom property (recomputed from the
 * live-measured anchor/floating rects on every open, so it's correct
 * even after a native `position-try-fallbacks` flip), rather than
 * setting `transform-origin` directly, so the value is visible to and
 * overridable from CSS.
 */
export function useFloatingPosition<
  TAnchor extends HTMLElement = HTMLElement,
  TFloating extends HTMLElement = HTMLElement,
>({ open, placement = "bottom", offset = 8 }: UseFloatingPositionOptions) {
  const anchorRef = useRef<TAnchor>(null);
  const floatingRef = useRef<TFloating>(null);
  const anchorName = `--kernel-anchor-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    const anchor = anchorRef.current;
    const floating = floatingRef.current;
    if (!anchor || !floating) return;

    // Deliberately not set eagerly here: this effect re-runs every time
    // `open` changes, which happens right after the native `toggle`
    // event already ran `syncOrigin` below (the same open) — writing a
    // static fallback unconditionally on every run would immediately
    // clobber that just-computed value back to the coarse keyword. The
    // CSS-side `var(--kernel-transform-origin, center)` default already
    // covers the brief window before the first open.
    function syncOrigin() {
      if (!anchor || !floating) return;
      const origin = computeTransformOrigin(anchor.getBoundingClientRect(), floating.getBoundingClientRect());
      floating.style.setProperty("--kernel-transform-origin", origin);
    }

    // Popover-based content (every current consumer) always fires this
    // natively on open/close, in both the anchor-positioning and
    // fallback code paths alike — measuring here, rather than eagerly on
    // mount, guarantees the floating element has already been laid out
    // (and flipped to its final side, if it flipped) by the time the
    // rects are read.
    function handleToggle(event: Event) {
      if ((event as ToggleEvent).newState === "open") syncOrigin();
    }
    floating.addEventListener("toggle", handleToggle);

    if (supportsAnchorPositioning) {
      anchor.style.setProperty("anchor-name", anchorName);
      floating.style.setProperty("position-anchor", anchorName);
      floating.style.setProperty("position-area", placement);
      floating.style.setProperty("position-try-fallbacks", `flip-block, flip-inline`);
      floating.style.setProperty("margin", `${offset}px`);
      // A resize can change which fallback side is active while already
      // open, so re-sync then too — window resize is cheap to listen for
      // unconditionally since this branch has no scroll listener at all.
      window.addEventListener("resize", syncOrigin);
      return () => {
        floating.removeEventListener("toggle", handleToggle);
        window.removeEventListener("resize", syncOrigin);
      };
    }

    if (!open) return () => floating.removeEventListener("toggle", handleToggle);

    function reposition() {
      const anchor = anchorRef.current;
      const floating = floatingRef.current;
      if (!anchor || !floating) return;

      const anchorRect = anchor.getBoundingClientRect();
      const floatingRect = floating.getBoundingClientRect();
      let top = 0;
      let left = 0;

      switch (placement) {
        case "bottom":
          top = anchorRect.bottom + offset;
          left = anchorRect.left + anchorRect.width / 2 - floatingRect.width / 2;
          break;
        case "top":
          top = anchorRect.top - floatingRect.height - offset;
          left = anchorRect.left + anchorRect.width / 2 - floatingRect.width / 2;
          break;
        case "left":
          top = anchorRect.top + anchorRect.height / 2 - floatingRect.height / 2;
          left = anchorRect.left - floatingRect.width - offset;
          break;
        case "right":
          top = anchorRect.top + anchorRect.height / 2 - floatingRect.height / 2;
          left = anchorRect.right + offset;
          break;
      }

      const margin = 8;
      left = Math.max(margin, Math.min(left, window.innerWidth - floatingRect.width - margin));
      top = Math.max(margin, Math.min(top, window.innerHeight - floatingRect.height - margin));

      floating.style.top = `${top}px`;
      floating.style.left = `${left}px`;
      syncOrigin();
    }

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      floating.removeEventListener("toggle", handleToggle);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, placement, offset, anchorName]);

  return { anchorRef, floatingRef, supportsAnchorPositioning };
}
