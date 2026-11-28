/**
 * Change reasons for the custom elements — the counterpart of
 * `@kernelui-lib/react`'s `ChangeDetails`.
 *
 * Every element that reports a change dispatches a bubbling, *cancelable*
 * `CustomEvent` *before* it commits the change, whose `detail` carries
 * `reason` (a string specific to the component, the same values the React
 * component uses) and `event` (the DOM event behind it, when there is one).
 * `event.preventDefault()` in a listener vetoes it: the element keeps its
 * current state and skips side effects such as closing. That event is
 * `valuechange` for value controls, `cancel` for Dialog/CommandPalette and
 * `beforetoggle` for disclosures. A control's `change` stays what it always
 * was, a notification *after* the commit (now with the same `detail`), so
 * handlers that read the element's state see the new value.
 */
export type KernelChangeDetail<Reason extends string, Detail extends object = object> = Detail & {
  reason: Reason;
  event?: Event;
};

let lastModality: "pointer" | "keyboard" = "pointer";
let trackingInstalled = false;

/** Installs (once) capture-phase listeners remembering whether the last
 * interaction was a pointer or a key: a `click` alone can't say (Space on a
 * checkbox and a tap on its label both arrive as one). */
export function trackInputModality() {
  if (trackingInstalled || typeof document === "undefined") return;
  trackingInstalled = true;
  document.addEventListener("pointerdown", () => (lastModality = "pointer"), true);
  document.addEventListener("mousedown", () => (lastModality = "pointer"), true);
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      lastModality = "keyboard";
    },
    true,
  );
}

/** `"keyboard"` when the event (or the last interaction on the page) came
 * from the keyboard; `"pointer"` otherwise. */
export function inputModality(event?: Event): "pointer" | "keyboard" {
  if (event && typeof KeyboardEvent !== "undefined" && event instanceof KeyboardEvent) return "keyboard";
  return lastModality;
}
