/**
 * Explains a native `popover="auto"` open/close after the fact, and lets it
 * be vetoed — for `Popover` and `DropdownMenu`, which leave opening,
 * light-dismiss and Escape to the platform.
 *
 * The platform's `beforetoggle` event says *that* the popover is about to
 * change, not *why*, so this remembers the last `pointerdown`/`keydown` on
 * the page: Escape → `"escape-key"`, a press on the trigger →
 * `"trigger-press"`, a press anywhere else → `"outside-press"`, nothing
 * recent → `"programmatic"`. A component that closes the popover itself (a
 * menu item) reports its own reason through `closeWith`.
 *
 * Cancelling: an *opening* `beforetoggle` is cancelable, so a veto stops it
 * outright. A closing one isn't (light dismiss can't be refused), so a vetoed
 * close re-shows the popover as soon as it has hidden; with the CSS
 * transitions reversible, that reads as the panel staying put.
 *
 * Browsers that fire `toggle` without `beforetoggle` still get notified,
 * from `toggle`, just too late to veto.
 */
export type PopoverOpenChangeReason = "trigger-press" | "escape-key" | "outside-press" | "programmatic";

const RECENT_MS = 1000;

export interface PopoverReasonController<Reason extends string> {
  /** Close the popover for a reason of the component's own, asking first. */
  closeWith(reason: Reason, event?: Event): void;
  dispose(): void;
}

export function attachPopoverReasons<Reason extends string = PopoverOpenChangeReason>(
  popover: HTMLElement,
  getTrigger: () => Element | null,
  /** Return `false` to veto. */
  onChange: (open: boolean, reason: Reason | PopoverOpenChangeReason, event: Event | undefined) => boolean,
): PopoverReasonController<Reason> {
  let last: { event: Event; time: number } | null = null;
  let notifiedState: "open" | "closed" | null = null;
  let reopenAfterHide = false;
  let reverting = false;

  const remember = (event: Event) => {
    last = { event, time: performance.now() };
  };

  function derive(open: boolean): { reason: PopoverOpenChangeReason; event?: Event } {
    if (!last || performance.now() - last.time > RECENT_MS) return { reason: "programmatic" };
    const { event } = last;
    const target = event.target instanceof Node ? event.target : null;
    // Only the trigger opens an auto popover; anything else was code.
    if (open) {
      return target && getTrigger()?.contains(target)
        ? { reason: "trigger-press", event }
        : { reason: "programmatic" };
    }
    if (event.type === "keydown" && (event as KeyboardEvent).key === "Escape") {
      return { reason: "escape-key", event };
    }
    if (target && getTrigger()?.contains(target)) return { reason: "trigger-press", event };
    if (event.type === "pointerdown" && target && !popover.contains(target)) {
      return { reason: "outside-press", event };
    }
    return { reason: "programmatic", event };
  }

  function notify(open: boolean): boolean {
    const cause = derive(open);
    return onChange(open, cause.reason, cause.event);
  }

  const handleBeforeToggle = (event: Event) => {
    if (reverting) return;
    const toggle = event as ToggleEvent;
    const open = toggle.newState === "open";
    notifiedState = open ? "open" : "closed";
    if (notify(open)) return;
    if (open && event.cancelable) event.preventDefault();
    else if (!open) reopenAfterHide = true;
  };

  const handleToggle = (event: Event) => {
    const toggle = event as ToggleEvent;
    if (reverting) return;
    if (reopenAfterHide) {
      reopenAfterHide = false;
      // The re-show queues its own `toggle`; it isn't news to anyone.
      notifiedState = "open";
      reverting = true;
      try {
        popover.showPopover();
      } catch {
        /* already showing */
      }
      reverting = false;
      return;
    }
    if (notifiedState !== toggle.newState) notify(toggle.newState === "open");
    notifiedState = null;
  };

  document.addEventListener("pointerdown", remember, true);
  document.addEventListener("keydown", remember, true);
  popover.addEventListener("beforetoggle", handleBeforeToggle);
  popover.addEventListener("toggle", handleToggle);

  return {
    closeWith(reason, event) {
      if (!onChange(false, reason, event)) return;
      // Already asked: neither the beforetoggle nor the toggle this hide
      // fires should ask again.
      notifiedState = "closed";
      reverting = true;
      try {
        popover.hidePopover();
      } catch {
        /* not showing */
      }
      reverting = false;
    },
    dispose() {
      document.removeEventListener("pointerdown", remember, true);
      document.removeEventListener("keydown", remember, true);
      popover.removeEventListener("beforetoggle", handleBeforeToggle);
      popover.removeEventListener("toggle", handleToggle);
    },
  };
}
