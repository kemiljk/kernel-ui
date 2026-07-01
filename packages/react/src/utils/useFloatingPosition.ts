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
 * coordinates).
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

    if (supportsAnchorPositioning) {
      anchor.style.setProperty("anchor-name", anchorName);
      floating.style.setProperty("position-anchor", anchorName);
      floating.style.setProperty("position-area", placement);
      floating.style.setProperty("position-try-fallbacks", `flip-block, flip-inline`);
      floating.style.setProperty("margin", `${offset}px`);
      return;
    }

    if (!open) return;

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
    }

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, placement, offset, anchorName]);

  return { anchorRef, floatingRef, supportsAnchorPositioning };
}
