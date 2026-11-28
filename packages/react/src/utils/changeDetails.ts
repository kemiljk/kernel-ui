/**
 * The second argument every Kernel change callback receives:
 * `onValueChange(value, details)`, `onOpenChange(open, details)`, and so on.
 *
 * `reason` says what caused the change, as a string union specific to each
 * component (`"item-press" | "keyboard"` for one, `"escape-key" |
 * "outside-press"` for another), so a handler can treat a keyboard
 * selection differently from a click, or skip analytics for programmatic
 * changes. `event` is the DOM event behind it, when there is one.
 *
 * `cancel()` vetoes the change. The component calls your callback *before*
 * it updates anything, and skips its own update — and any side effect, such
 * as closing a menu — when you cancel. In a controlled component the value
 * is already yours, so cancelling only stops those side effects; simply not
 * updating your state is enough to keep the old value.
 *
 * Purely additive: a callback that takes one argument never sees it.
 */
export interface ChangeDetails<Reason extends string = string> {
  /** What caused the change. Each component documents its own union. */
  reason: Reason;
  /** The DOM event behind the change, when there is one. */
  event?: Event;
  /** Veto the change: the component keeps its current state and skips
   * side effects such as closing. */
  cancel(): void;
  /** Whether `cancel()` has been called. */
  readonly isCanceled: boolean;
}

/** Anything carrying a DOM event: a native `Event` or a React synthetic
 * event (whose `nativeEvent` is used). */
export type ChangeEventSource = Event | { nativeEvent: Event } | undefined | null;

function toNativeEvent(source: ChangeEventSource): Event | undefined {
  if (!source) return undefined;
  if (typeof Event !== "undefined" && source instanceof Event) return source;
  if (typeof source === "object" && "nativeEvent" in source) return source.nativeEvent;
  return undefined;
}

/** Builds a fresh `ChangeDetails` for one change. */
export function createChangeDetails<Reason extends string>(
  reason: Reason,
  event?: ChangeEventSource,
): ChangeDetails<Reason> {
  let canceled = false;
  return {
    reason,
    event: toNativeEvent(event),
    cancel() {
      canceled = true;
    },
    get isCanceled() {
      return canceled;
    },
  };
}

/** A change callback that accepts `ChangeDetails` as its second argument.
 * A one-argument function is assignable to it, which is what keeps the
 * whole API additive. */
export type ChangeHandler<T, Reason extends string> = (value: T, details: ChangeDetails<Reason>) => void;

let lastModality: "pointer" | "keyboard" = "pointer";
let trackingInstalled = false;

/** Installs (once) two capture-phase listeners that remember whether the
 * last interaction was a pointer or a key press. Needed because a `click`
 * or `change` event alone can't always say: Space on a checkbox and a tap
 * on its label both arrive as a `click`. */
export function trackInputModality() {
  if (trackingInstalled || typeof document === "undefined") return;
  trackingInstalled = true;
  document.addEventListener("pointerdown", () => (lastModality = "pointer"), true);
  document.addEventListener("mousedown", () => (lastModality = "pointer"), true);
  document.addEventListener(
    "keydown",
    (event) => {
      // Modifier chords (Cmd+R, Ctrl+Tab) aren't operating a control.
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      lastModality = "keyboard";
    },
    true,
  );
}

/** `"keyboard"` when the event (or, failing that, the last interaction on
 * the page) came from the keyboard; `"pointer"` otherwise. */
export function inputModality(source?: ChangeEventSource): "pointer" | "keyboard" {
  const event = toNativeEvent(source);
  if (event && typeof KeyboardEvent !== "undefined" && event instanceof KeyboardEvent) return "keyboard";
  return lastModality;
}
