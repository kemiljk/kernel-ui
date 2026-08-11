/**
 * Marks an element `data-lines="single"` or `data-lines="multi"` from how many
 * lines its text actually renders on, and keeps that up to date as it reflows.
 *
 * This exists because "round this like a pill only while the text fits on one
 * line" isn't expressible in CSS. `border-radius: 999px` is clamped by the
 * browser to half the smaller dimension, which is exactly the pill you want on
 * a one-line box and exactly the stadium you don't want on a three-line one —
 * and no container query helps, since the condition is the element's own
 * rendered height, which a size container can't measure without a fixed one.
 *
 * A `ResizeObserver` is the cheap way to track it: reflow from a viewport
 * change, a font swap, or streamed text all arrive through the same callback,
 * and the attribute write is skipped when the answer hasn't changed, so a
 * growing message doesn't churn style recalcs.
 */
export function observeLineFit(element: HTMLElement): () => void {
  let last: "single" | "multi" | null = null;

  const measure = () => {
    const style = getComputedStyle(element);
    const lineHeight = parseFloat(style.lineHeight);
    // Logical properties first, physical as the fallback: `paddingBlockStart`
    // resolves in every engine Kernel targets, but a computed-style shim that
    // only knows the physical longhands would otherwise return NaN here and
    // make every bubble read as multi-line.
    const padStart = parseFloat(style.paddingBlockStart) || parseFloat(style.paddingTop) || 0;
    const padEnd = parseFloat(style.paddingBlockEnd) || parseFloat(style.paddingBottom) || 0;
    const contentHeight = element.clientHeight - padStart - padEnd;
    // Unitless/`normal` line-height computes to a pixel value in every engine
    // that matters; bail rather than guess if it somehow doesn't.
    if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;
    // Half a line of slack: descenders, sub-pixel line boxes and zoom all put
    // a single line a fraction over its own line-height.
    const next = contentHeight <= lineHeight * 1.5 ? "single" : "multi";
    if (next === last) return;
    last = next;
    element.dataset.lines = next;
  };

  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(element);
  return () => observer.disconnect();
}
