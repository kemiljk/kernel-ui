export type FloatingPlacement = "top" | "bottom" | "left" | "right";

export interface FloatingPositionOptions {
  placement?: FloatingPlacement;
  /** Gap between the anchor and the floating element, in pixels. */
  offset?: number;
}

let anchorCounter = 0;

const supportsAnchorPositioning =
  typeof CSS !== "undefined" && CSS.supports("anchor-name: --kernel-support-check");

const TRANSFORM_ORIGIN_BY_PLACEMENT: Record<FloatingPlacement, string> = {
  top: "bottom center",
  bottom: "top center",
  left: "center right",
  right: "center left",
};

/**
 * Vanilla-JS port of `@kernelui/react`'s `useFloatingPosition` hook —
 * same CSS-anchor-positioning-first, `getBoundingClientRect`-fallback
 * strategy, just driven imperatively (`attach()`/`setOpen()`/
 * `destroy()`) instead of as a React hook. See the React version's own
 * doc comment for the full rationale.
 *
 * The floating element must have `position: fixed` in its own
 * stylesheet — both code paths assume viewport-relative coordinates.
 */
export class FloatingPositioner {
  private anchor: HTMLElement | null = null;
  private floating: HTMLElement | null = null;
  private placement: FloatingPlacement = "bottom";
  private offset = 8;
  private readonly anchorName = `--kernel-anchor-${++anchorCounter}`;
  private open = false;
  private reposition = () => {};

  attach(anchor: HTMLElement, floating: HTMLElement, options: FloatingPositionOptions = {}) {
    this.anchor = anchor;
    this.floating = floating;
    this.placement = options.placement ?? "bottom";
    this.offset = options.offset ?? 8;

    if (supportsAnchorPositioning) {
      anchor.style.setProperty("anchor-name", this.anchorName);
      floating.style.setProperty("position-anchor", this.anchorName);
      floating.style.setProperty("position-area", this.placement);
      floating.style.setProperty("position-try-fallbacks", "flip-block, flip-inline");
      floating.style.setProperty("margin", `${this.offset}px`);
      floating.style.transformOrigin = TRANSFORM_ORIGIN_BY_PLACEMENT[this.placement];
      return;
    }

    floating.style.transformOrigin = TRANSFORM_ORIGIN_BY_PLACEMENT[this.placement];
    this.reposition = () => this.repositionFallback();
  }

  /** Toggles the fallback path's scroll/resize listeners. No-op when
   * native anchor positioning is in play (nothing to listen for). */
  setOpen(open: boolean) {
    this.open = open;
    if (supportsAnchorPositioning) return;
    if (open) {
      this.reposition();
      window.addEventListener("resize", this.reposition);
      window.addEventListener("scroll", this.reposition, true);
    } else {
      window.removeEventListener("resize", this.reposition);
      window.removeEventListener("scroll", this.reposition, true);
    }
  }

  private repositionFallback() {
    const anchor = this.anchor;
    const floating = this.floating;
    if (!anchor || !floating) return;

    const anchorRect = anchor.getBoundingClientRect();
    const floatingRect = floating.getBoundingClientRect();
    let top = 0;
    let left = 0;

    switch (this.placement) {
      case "bottom":
        top = anchorRect.bottom + this.offset;
        left = anchorRect.left + anchorRect.width / 2 - floatingRect.width / 2;
        break;
      case "top":
        top = anchorRect.top - floatingRect.height - this.offset;
        left = anchorRect.left + anchorRect.width / 2 - floatingRect.width / 2;
        break;
      case "left":
        top = anchorRect.top + anchorRect.height / 2 - floatingRect.height / 2;
        left = anchorRect.left - floatingRect.width - this.offset;
        break;
      case "right":
        top = anchorRect.top + anchorRect.height / 2 - floatingRect.height / 2;
        left = anchorRect.right + this.offset;
        break;
    }

    const margin = 8;
    left = Math.max(margin, Math.min(left, window.innerWidth - floatingRect.width - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - floatingRect.height - margin));

    floating.style.top = `${top}px`;
    floating.style.left = `${left}px`;
  }

  destroy() {
    if (this.open) this.setOpen(false);
    this.anchor = null;
    this.floating = null;
  }
}
