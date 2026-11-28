import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { FocusEvent as ReactFocusEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
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
 * `interestfor` is declared on the trigger for the same reason Tooltip
 * declares it: the native hover-intent API. Where a browser implements
 * it (Chromium), it also shows the card on hover or focus and drops it
 * on a real Escape; everywhere else the handlers below do all the work,
 * and they agree with it where both run.
 *
 * Keyboard: the card follows its trigger in the DOM, so Tab moves from
 * the trigger into a link inside it, and focus anywhere in the card
 * keeps it open. Escape dismisses it (WCAG 1.4.13, as Tooltip does),
 * handing focus back to the trigger if it was inside the card, without
 * also closing a dialog the trigger sits in.
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
  /** Set while Escape hands focus back to the trigger, so that focus
   * doesn't immediately reopen the card it just dismissed. */
  const suppressFocusOpenRef = useRef(false);
  /** Set by Escape until the pointer really leaves (or the trigger is
   * focused again). A card appearing or animating under a pointer that
   * hasn't moved gets boundary events the user never made — Firefox
   * delivers them from its refresh driver, a frame or more late, so one can
   * land mid-exit — and without this a `pointerenter` on the closing card
   * would rescue it, undoing the dismissal WCAG 1.4.13 asks for. */
  const escapeDismissedRef = useRef(false);
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
      // Commit (and run the Escape listener's effect) before the card is
      // on screen, so an Escape pressed the moment it appears dismisses it.
      flushSync(() => {
        setClosing(false);
        setOpen(true);
      });
      popoverRef.current?.showPopover?.();
    }, delay);
  }

  /** Touch synthesizes pointerenter/pointerleave on tap with no real
   * "hovering" in between, so a touch tap would otherwise trigger this
   * mouse-tuned open-delay affordance for an input that has no hover
   * concept at all; `onFocus` (below) already covers tap-to-reveal. */
  function showOnHover(event: { pointerType: string }, delay: number) {
    if (event.pointerType === "touch" || escapeDismissedRef.current) return;
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
    clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      // The pointer left, but a keyboard user is still inside the card.
      if (popoverRef.current?.contains(document.activeElement)) return;
      void hideNow();
    }, closeDelay);
  }

  /** Blur from the trigger or the card: stay open while focus moves
   * between the two (Tab from the trigger into a link in the card). */
  function hideOnBlur(event: ReactFocusEvent) {
    const next = event.relatedTarget as Node | null;
    if (next && (popoverRef.current?.contains(next) || anchorRef.current?.contains(next))) return;
    scheduleHide();
  }

  // WCAG 1.4.13: content shown on hover or focus must be dismissible
  // without moving the pointer or focus. preventDefault keeps that
  // Escape from also closing a dialog the trigger sits in.
  useEffect(() => {
    if (!open || closing) return;
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      escapeDismissedRef.current = true;
      clearTimeout(openTimeoutRef.current);
      clearTimeout(closeTimeoutRef.current);
      if (popoverRef.current?.contains(document.activeElement)) {
        suppressFocusOpenRef.current = true;
        anchorRef.current?.focus();
        suppressFocusOpenRef.current = false;
      }
      void hideNow();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closing]);

  /** The pointer left for real: hover may open the card again. */
  function leave() {
    escapeDismissedRef.current = false;
    scheduleHide();
  }

  function cancelHideOnHover() {
    if (escapeDismissedRef.current) return;
    cancelHide();
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
      onPointerLeave: leave,
      onFocus: () => {
        if (suppressFocusOpenRef.current) return;
        escapeDismissedRef.current = false;
        show(0);
      },
      onBlur: hideOnBlur,
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
      onPointerEnter: cancelHideOnHover,
      onPointerLeave: leave,
      onFocus: cancelHide,
      onBlur: hideOnBlur,
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
