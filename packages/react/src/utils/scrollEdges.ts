/**
 * Marks which physical edges of a horizontal scroller have content
 * hidden past them, as `data-overflow-left` / `data-overflow-right`, so
 * CSS can fade only the edge that actually hides something.
 *
 * Physical, not logical, on purpose: the fade is drawn with a
 * `linear-gradient(to right, …)` mask, and a mask has no logical
 * direction. `scrollLeft` is 0 at the inline start in both directions
 * and runs negative in RTL (the spec'd behaviour every current engine
 * ships), so the left/right maths flips on `direction`.
 */
export function syncScrollEdges(element: HTMLElement) {
  const max = element.scrollWidth - element.clientWidth;
  if (max <= 1) {
    delete element.dataset.overflowLeft;
    delete element.dataset.overflowRight;
    return;
  }
  const rtl = getComputedStyle(element).direction === "rtl";
  const x = element.scrollLeft;
  const hiddenLeft = rtl ? x + max : x;
  const hiddenRight = rtl ? -x : max - x;
  toggle(element, "overflowLeft", hiddenLeft > 1);
  toggle(element, "overflowRight", hiddenRight > 1);
}

function toggle(element: HTMLElement, key: string, on: boolean) {
  if (on) element.dataset[key] = "";
  else delete element.dataset[key];
}
