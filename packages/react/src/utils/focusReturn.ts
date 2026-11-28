/**
 * Where focus goes back to when a top-layer surface (a modal `<dialog>`, an
 * auto popover) closes, in browsers that never put it on the opener.
 *
 * Safari, and every WebKit browser on iOS, doesn't focus a `<button>` when
 * it's clicked or tapped (a macOS platform convention). So when a click
 * opens a dialog or a popover, `document.activeElement` is still `<body>`,
 * and that's what the browser records as the element to restore focus to.
 * Escape then drops focus on `<body>` and the next Tab starts from the top
 * of the page, instead of from the button the user just used. Chromium and
 * Firefox focus the button on click, so their native restore is already
 * right and everything here is a no-op for them.
 *
 * The fix has two halves: remember the focusable control a pointer pressed
 * (a capture-phase `pointerdown`, read through shadow roots), and on close,
 * if focus was lost — it's on `<body>`, or still inside the closing surface
 * — send it to that control. Focus the user has already moved somewhere
 * else on purpose is never taken back.
 *
 * Kept in lockstep with `packages/elements/src/utils/focusReturn.ts`.
 */

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"]), [contenteditable]:not([contenteditable="false"])';

/** A press older than this didn't open whatever is opening now. */
const RECENT_MS = 1500;

let lastPressed: { element: HTMLElement; time: number } | null = null;
let installed = false;

/** Installs (once) the capture-phase listener that remembers the last
 * focusable control a pointer pressed. */
export function trackPressedControl() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener(
    "pointerdown",
    (event) => {
      const control = event
        .composedPath()
        .find((node): node is HTMLElement => node instanceof HTMLElement && node.matches(FOCUSABLE));
      lastPressed = control ? { element: control, time: performance.now() } : null;
    },
    true,
  );
}

/** `element` if it takes focus, else the first descendant that does: a
 * trigger handed over as a wrapper still gets focus on the real control. */
export function focusableWithin(element: Element | null | undefined): HTMLElement | null {
  if (!(element instanceof HTMLElement)) return null;
  return element.matches(FOCUSABLE) ? element : element.querySelector<HTMLElement>(FOCUSABLE);
}

/**
 * `dialog.showModal()`, and on its `close` event, focus back on whatever
 * opened it if the browser's own restore lost it. Use it in place of a
 * bare `showModal()` for every modal surface.
 */
export function showModalReturningFocus(dialog: HTMLDialogElement) {
  trackPressedControl();
  const target = captureReturnTarget();
  dialog.showModal();
  dialog.addEventListener("close", () => restoreFocusIfLost(target, dialog), { once: true });
}

/** The innermost focused element, looking through open shadow roots. */
function deepActiveElement(): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

/**
 * Call as a surface opens: the element focus should return to when it
 * closes. The focused element when there is one; otherwise (WebKit, after
 * a click) the control the pointer just pressed; otherwise `null`.
 */
export function captureReturnTarget(): HTMLElement | null {
  const active = deepActiveElement();
  if (active instanceof HTMLElement && active !== document.body) return active;
  if (lastPressed && performance.now() - lastPressed.time < RECENT_MS && lastPressed.element.isConnected) {
    return lastPressed.element;
  }
  return null;
}

/**
 * Call after a surface has closed: focuses `target` only when focus was
 * lost — on `<body>` (or nothing), or still inside `surface`. Anywhere else
 * means the user, or the browser's own restore, already put it somewhere.
 */
export function restoreFocusIfLost(target: HTMLElement | null | undefined, surface?: Element | null) {
  if (!target?.isConnected) return;
  const active = deepActiveElement();
  const lost = !active || active === document.body || (surface ? surface.contains(active) : false);
  if (!lost || active === target) return;
  target.focus({ preventScroll: true });
}
