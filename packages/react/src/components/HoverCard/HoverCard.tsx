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
import styles from "./HoverCard.module.css";

export interface HoverCardState {
  open: boolean;
  /** True while the exit animation is still playing. */
  closing: boolean;
  placement: FloatingPlacement;
  align: FloatingAlign;
}

export interface HoverCardProps {
  content: ReactNode;
  placement?: FloatingPlacement;
  /** Cross-axis alignment relative to the trigger. */
  align?: FloatingAlign;
  /** Gap between the trigger and the card, in pixels. */
  offset?: number;
  /** Classes for the card popup. */
  className?: ClassNameValue<HoverCardState>;
  /** Replace the popup element (e.g. wrap with Motion). */
  renderContent?: RenderProp<HoverCardState>;
  /** The element that triggers the card on hover/focus. */
  render: RenderProp<HoverCardState>;
  /** Delay before showing on hover, in milliseconds. Focus shows
   * near-instantly regardless, a keyboard user tabbing to the trigger
   * shouldn't have to wait out a mouse-tuned delay. */
  openDelay?: number;
  /** Delay before hiding once the pointer leaves both the trigger and
   * the card, in milliseconds. */
  closeDelay?: number;
}

/**
 * A heavier Tooltip: same `useFloatingPosition` + `popover="manual"` +
 * hover/focus-triggered mechanism, but for richer content that can be
 * multi-line and interactive (a link inside the card, say). That
 * interactivity is why open/close aren't instant like Tooltip's
 * (defaults 0/0): `openDelay` avoids flashing a card for every pointer
 * pass, and `closeDelay` gives the pointer time to travel from the
 * trigger into the card itself before it closes out from under it.
 * Both timers are cancelled if the pointer re-enters either element
 * before they fire.
 *
 * Defaults (150ms open / 100ms close) sit between Tooltip's instant
 * open and the old 400/200 pair: transitions.dev's tooltip recipe uses
 * an ~80ms appear-only delay with instant exit, but HoverCard content
 * is interactive and heavier, so we keep a short open filter and a
 * non-zero close bridge without feeling sluggish. Focus still opens
 * near-instantly regardless.
 *
 * `popover="manual"` because that custom timing is exactly what
 * `popover="auto"`'s built-in light-dismiss doesn't support, the same
 * reasoning Combobox uses for its listbox.
 *
 * `interestfor` is declared on the trigger for the same forward-looking
 * reason Tooltip declares it: a purely additive stand-in for the
 * emerging native hover-intent API, today the handlers below do the
 * actual work.
 *
 * `data-open` / `data-closing` / `data-placement` / `data-align` expose
 * styling state for consumer CSS and Motion without targeting generated
 * class names. `data-closing` is what the exit animation hangs off, and
 * it's set while the card is still open on purpose — see `hideNow`.
 */
export function HoverCard({
  content,
  placement = "bottom",
  align = "center",
  offset = 8,
  className,
  renderContent,
  render,
  openDelay = 150,
  closeDelay = 100,
}: HoverCardProps) {
  const [open, setOpen] = useState(false);
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

  const state: HoverCardState = { open, closing, placement, align };

  useEffect(() => {
    return () => {
      clearTimeout(openTimeoutRef.current);
      clearTimeout(closeTimeoutRef.current);
      exitAbortRef.current?.abort();
    };
  }, []);

  function show(delay: number) {
    clearTimeout(closeTimeoutRef.current);
    clearTimeout(openTimeoutRef.current);
    openTimeoutRef.current = setTimeout(() => {
      exitAbortRef.current?.abort();
      exitAbortRef.current = null;
      setClosing(false);
      setOpen(true);
      popoverRef.current?.showPopover?.();
    }, delay);
  }

  /** Touch synthesizes pointerenter/pointerleave on tap with no real
   * "hovering" in between, so a touch tap would otherwise trigger this
   * mouse-tuned open-delay affordance for an input that has no hover
   * concept at all; `onFocus` (below) already covers tap-to-reveal. */
  function showOnHover(event: { pointerType: string }, delay: number) {
    if (event.pointerType === "touch") return;
    show(delay);
  }

  /** Plays the exit while the card is still open, then hides it for
   * real — the reverse order (hide, then animate) leaves the browser
   * animating an element it has already pulled out of the top layer. */
  async function hideNow() {
    const node = popoverRef.current;
    if (!node || (!open && !closing)) return;

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
    "a",
    {
      ref: anchorRef,
      "aria-describedby": id,
      interestfor: id,
      onPointerEnter: (event: ReactPointerEvent) => showOnHover(event, openDelay),
      onPointerLeave: scheduleHide,
      onFocus: () => show(0),
      onBlur: scheduleHide,
    },
    state,
  );

  const popup = renderElement(
    renderContent,
    "div",
    {
      ref: mergeRefs(popoverRef, floatingRef),
      id,
      role: "group",
      popover: "manual",
      "data-slot": "hover-card-content",
      "data-placement": placement,
      "data-align": align,
      "data-open": dataAttr(open && !closing),
      "data-closing": dataAttr(closing),
      className: [styles.content, resolveClassName(className, state)].filter(Boolean).join(" "),
      onPointerEnter: cancelHide,
      onPointerLeave: scheduleHide,
      children: content,
    },
    state,
  );

  return (
    <>
      {trigger}
      {popup}
    </>
  );
}
