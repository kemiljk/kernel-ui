import { useEffect, useId, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import {
  dataAttr,
  mergeRefs,
  renderElement,
  resolveClassName,
  type ClassNameValue,
  type RenderProp,
} from "../../utils/polymorphic";
import {
  useFloatingPosition,
  type FloatingAlign,
  type FloatingPlacement,
} from "../../utils/useFloatingPosition";
import { prefersReducedMotion, waitForExitTransition } from "../../utils/exitTransition";
import styles from "./Tooltip.module.css";

export interface TooltipState {
  open: boolean;
  opening: boolean;
  closing: boolean;
  placement: FloatingPlacement;
  align: FloatingAlign;
}

export interface TooltipProps {
  content: ReactNode;
  placement?: FloatingPlacement;
  /** Cross-axis alignment relative to the trigger. */
  align?: FloatingAlign;
  /** Gap between the trigger and the tooltip, in pixels. */
  offset?: number;
  /** Delay before showing on hover, in milliseconds. Focus shows
   * near-instantly regardless. */
  openDelay?: number;
  /** Delay before hiding once the pointer leaves both the trigger and
   * the tooltip. Gives the pointer time to travel into rich content. */
  closeDelay?: number;
  /** Renders a default arrow pointing toward the trigger. */
  arrow?: boolean;
  /** Replace the default arrow, or omit it with a no-op render. */
  renderArrow?: RenderProp<TooltipState>;
  /** Classes for the tooltip popup. */
  className?: ClassNameValue<TooltipState>;
  /** Replace the popup element (e.g. wrap with Motion). */
  renderContent?: RenderProp<TooltipState>;
  /** The element that triggers the tooltip on hover/focus. */
  render: RenderProp;
}

/**
 * Uses the Popover API (`popover="manual"`, since we drive it from
 * hover/focus rather than a click toggle) for the top-layer stacking and
 * `showPopover()`/`hidePopover()` for visibility, and `useFloatingPosition`
 * for placement.
 *
 * `interestfor` is declared on the trigger as a forward-looking, purely
 * additive enhancement: it's the emerging native hover-intent attribute
 * that's meant to make the hover/focus wiring below unnecessary
 * eventually. Today, the `onMouseEnter`/`onFocus` handlers are what
 * actually shows and hides the tooltip in every browser.
 *
 * Open/close delays mirror HoverCard so a rich tooltip can keep the
 * pointer path between trigger and content alive without flashing shut.
 * `data-open` / `data-opening` / `data-closing` / `data-placement` expose
 * styling state for consumer CSS and Motion without targeting generated
 * class names.
 */
export function Tooltip({
  content,
  placement = "top",
  align = "center",
  offset = 8,
  openDelay = 0,
  closeDelay = 0,
  arrow = false,
  renderArrow,
  className,
  renderContent,
  render,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const id = useId();
  const popoverRef = useRef<HTMLDivElement>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const exitAbortRef = useRef<AbortController | null>(null);
  const { anchorRef, floatingRef } = useFloatingPosition<HTMLElement, HTMLDivElement>({
    open,
    placement,
    align,
    offset,
  });

  const state: TooltipState = { open, opening, closing, placement, align };

  useEffect(() => {
    return () => {
      clearTimeout(openTimeoutRef.current);
      clearTimeout(closeTimeoutRef.current);
      exitAbortRef.current?.abort();
    };
  }, []);

  function clearTimers() {
    clearTimeout(openTimeoutRef.current);
    clearTimeout(closeTimeoutRef.current);
  }

  function showNow() {
    exitAbortRef.current?.abort();
    exitAbortRef.current = null;
    clearTimers();
    setClosing(false);
    setOpening(true);
    setOpen(true);
    popoverRef.current?.showPopover?.();
    requestAnimationFrame(() => setOpening(false));
  }

  function show(delay: number) {
    clearTimeout(closeTimeoutRef.current);
    if (open && !closing) {
      clearTimeout(openTimeoutRef.current);
      return;
    }
    clearTimeout(openTimeoutRef.current);
    if (delay <= 0) {
      showNow();
      return;
    }
    openTimeoutRef.current = setTimeout(showNow, delay);
  }

  function showOnHover(event: { pointerType: string }, delay: number) {
    if (event.pointerType === "touch") return;
    show(delay);
  }

  async function hideNow() {
    clearTimers();
    const node = popoverRef.current;
    if (!node || (!open && !closing)) return;

    setOpening(false);
    setClosing(true);

    if (!prefersReducedMotion()) {
      const controller = new AbortController();
      exitAbortRef.current?.abort();
      exitAbortRef.current = controller;
      await waitForExitTransition(node, { signal: controller.signal });
      if (controller.signal.aborted) return;
    }

    setOpen(false);
    setClosing(false);
    node.hidePopover?.();
  }

  function scheduleHide() {
    clearTimeout(openTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      void hideNow();
    }, closeDelay);
  }

  function cancelHide() {
    clearTimeout(closeTimeoutRef.current);
    if (closing) {
      exitAbortRef.current?.abort();
      setClosing(false);
      setOpen(true);
      popoverRef.current?.showPopover?.();
    }
  }

  const trigger = renderElement(
    render,
    "button",
    {
      ref: anchorRef,
      "aria-describedby": id,
      interestfor: id,
      onPointerEnter: (event: ReactPointerEvent) => showOnHover(event, openDelay),
      onPointerLeave: scheduleHide,
      onFocus: () => show(0),
      onBlur: scheduleHide,
    },
    {},
  );

  const resolvedClassName = [
    styles.content,
    resolveClassName(className, state),
  ]
    .filter(Boolean)
    .join(" ");

  const arrowNode =
    renderArrow !== undefined
      ? renderElement(
          renderArrow,
          "span",
          {
            "data-slot": "tooltip-arrow",
            "aria-hidden": true,
            className: styles.arrow,
          },
          state,
        )
      : arrow
        ? (
            <span data-slot="tooltip-arrow" aria-hidden="true" className={styles.arrow} />
          )
        : null;

  const popupProps: Record<string, unknown> = {
    ref: mergeRefs(popoverRef, floatingRef),
    id,
    role: "tooltip",
    popover: "manual",
    "data-slot": "tooltip-content",
    "data-placement": placement,
    "data-align": align,
    "data-open": dataAttr(open && !closing),
    "data-opening": dataAttr(opening),
    "data-closing": dataAttr(closing),
    className: resolvedClassName,
    onPointerEnter: cancelHide,
    onPointerLeave: scheduleHide,
    children: (
      <>
        {content}
        {arrowNode}
      </>
    ),
  };

  const popup = renderElement(renderContent, "div", popupProps, state);

  return (
    <>
      {trigger}
      {popup}
    </>
  );
}
