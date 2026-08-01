export type FloatingPlacement = "top" | "bottom" | "left" | "right";
export type FloatingAlign = "start" | "center" | "end";

export interface FloatingPositionOptions {
  placement?: FloatingPlacement;
  /** Cross-axis alignment relative to the anchor. */
  align?: FloatingAlign;
  /** Gap between the anchor and the floating element, in pixels. */
  offset?: number;
}

let anchorCounter = 0;

/** Reads the `placement`/`align`/`offset` attribute trio every anchored
 * element exposes, so all of them parse it identically (and a malformed
 * `offset` falls back rather than positioning at `NaN`). Pass `defaults`
 * for the components whose resting placement isn't `bottom`. */
export function readFloatingAttributes(
  host: Element,
  defaults: FloatingPositionOptions = {},
): Required<FloatingPositionOptions> {
  const offset = Number(host.getAttribute("offset"));
  return {
    placement: (host.getAttribute("placement") as FloatingPlacement) || defaults.placement || "bottom",
    align: (host.getAttribute("align") as FloatingAlign) || defaults.align || "center",
    offset: Number.isFinite(offset) && host.hasAttribute("offset") ? offset : (defaults.offset ?? 8),
  };
}

const supportsAnchorPositioning =
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("anchor-name: --kernel-support-check");

/** Coarse fallback used only for the very first paint, before real rects
 * exist to measure — the exact origin below replaces this the instant
 * the floating element actually opens. */
const TRANSFORM_ORIGIN_BY_PLACEMENT: Record<FloatingPlacement, string> = {
  top: "bottom center",
  bottom: "top center",
  left: "center right",
  right: "center left",
};

/** See the matching function in `@kernelui-lib/react`'s `useFloatingPosition`
 * for the full rationale — same anchor-relative percentage approach
 * Radix/Base UI use for their own `transform-origin` CSS variables. */
function computeTransformOrigin(anchorRect: DOMRect, floatingRect: DOMRect): string {
  if (floatingRect.width === 0 || floatingRect.height === 0) return "center";
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  const x = clamp(((anchorRect.left + anchorRect.width / 2 - floatingRect.left) / floatingRect.width) * 100);
  const y = clamp(((anchorRect.top + anchorRect.height / 2 - floatingRect.top) / floatingRect.height) * 100);
  return `${x}% ${y}%`;
}

function positionArea(
  placement: FloatingPlacement,
  align: FloatingAlign,
): string {
  if (align === "center") return `${placement} center`;

  if (placement === "top" || placement === "bottom") {
    return `${placement} ${align === "start" ? "span-right" : "span-left"}`;
  }

  return `${placement} ${align === "start" ? "span-bottom" : "span-top"}`;
}

function alignedCrossAxis(
  anchorStart: number,
  anchorSize: number,
  floatingSize: number,
  align: FloatingAlign,
): number {
  if (align === "start") return anchorStart;
  if (align === "end") return anchorStart + anchorSize - floatingSize;
  return anchorStart + anchorSize / 2 - floatingSize / 2;
}

/**
 * Vanilla-JS port of `@kernelui-lib/react`'s `useFloatingPosition` hook —
 * same CSS-anchor-positioning-first, `getBoundingClientRect`-fallback
 * strategy, just driven imperatively (`attach()`/`setOpen()`/
 * `destroy()`) instead of as a React hook. See the React version's own
 * doc comment for the full rationale.
 *
 * The floating element must have `position: fixed` in its own
 * stylesheet — both code paths assume viewport-relative coordinates —
 * and should reference `transform-origin: var(--kernel-transform-origin,
 * center)` in its own CSS rather than relying on a directly-set inline
 * `transform-origin`, so the value stays visible to and overridable from
 * CSS. It's written as a custom property, recomputed from the
 * live-measured anchor/floating rects every time the floating element's
 * native `toggle` event reports it opening, so it stays correct even
 * after a native `position-try-fallbacks` flip.
 */
export class FloatingPositioner {
  private anchor: HTMLElement | null = null;
  private floating: HTMLElement | null = null;
  private placement: FloatingPlacement = "bottom";
  private align: FloatingAlign = "center";
  private offset = 8;
  private readonly anchorName = `--kernel-anchor-${++anchorCounter}`;
  private open = false;
  private reposition = () => {};
  private readonly syncOrigin = () => {
    const anchor = this.anchor;
    const floating = this.floating;
    if (!anchor || !floating) return;
    floating.style.setProperty(
      "--kernel-transform-origin",
      computeTransformOrigin(anchor.getBoundingClientRect(), floating.getBoundingClientRect()),
    );
  };
  private readonly handleToggle = (event: Event) => {
    if ((event as ToggleEvent).newState === "open") this.syncOrigin();
  };

  attach(anchor: HTMLElement, floating: HTMLElement, options: FloatingPositionOptions = {}) {
    this.anchor = anchor;
    this.floating = floating;
    this.placement = options.placement ?? "bottom";
    this.align = options.align ?? "center";
    this.offset = options.offset ?? 8;

    floating.style.setProperty("--kernel-transform-origin", TRANSFORM_ORIGIN_BY_PLACEMENT[this.placement]);
    floating.addEventListener("toggle", this.handleToggle);

    if (supportsAnchorPositioning) {
      anchor.style.setProperty("anchor-name", this.anchorName);
      floating.style.setProperty("position-anchor", this.anchorName);
      floating.style.setProperty(
        "position-area",
        positionArea(this.placement, this.align),
      );
      floating.style.setProperty("position-try-fallbacks", "flip-block, flip-inline");
      floating.style.setProperty("margin", `${this.offset}px`);
      // A resize can change which fallback side is active while already
      // open, so re-sync then too.
      window.addEventListener("resize", this.syncOrigin);
      return;
    }

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
        left = alignedCrossAxis(anchorRect.left, anchorRect.width, floatingRect.width, this.align);
        break;
      case "top":
        top = anchorRect.top - floatingRect.height - this.offset;
        left = alignedCrossAxis(anchorRect.left, anchorRect.width, floatingRect.width, this.align);
        break;
      case "left":
        top = alignedCrossAxis(anchorRect.top, anchorRect.height, floatingRect.height, this.align);
        left = anchorRect.left - floatingRect.width - this.offset;
        break;
      case "right":
        top = alignedCrossAxis(anchorRect.top, anchorRect.height, floatingRect.height, this.align);
        left = anchorRect.right + this.offset;
        break;
    }

    const margin = 8;
    left = Math.max(margin, Math.min(left, window.innerWidth - floatingRect.width - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - floatingRect.height - margin));

    floating.style.top = `${top}px`;
    floating.style.left = `${left}px`;
    this.syncOrigin();
  }

  destroy() {
    if (this.open) this.setOpen(false);
    if (this.floating) {
      this.floating.removeEventListener("toggle", this.handleToggle);
      window.removeEventListener("resize", this.syncOrigin);
    }
    this.anchor = null;
    this.floating = null;
  }
}
