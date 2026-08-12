import { kernelClass } from "../../base";
// Import order is load-bearing: `Dialog` pulls in `Dialog.css`, and `Sheet.css`
// has to land *after* it in the bundle. Sheet's per-side rules are
// specificity-matched to Dialog's rather than escalated above them, so source
// order is what decides them. Don't reorder these two imports.
import { KernelDialog } from "../Dialog/Dialog";
import { prefersReducedMotion } from "../../utils/exitTransition";
import { parseSnapPoints } from "../../utils/snapPoints";
import { parseSpring, runSpring } from "../../utils/spring";
import {
  attachSheetDrag,
  DEFAULT_CLOSE_THRESHOLD,
  DEFAULT_VELOCITY_THRESHOLD,
  type SheetDragController,
  type SheetDragOptions,
  type SheetSide,
} from "../../utils/sheetDrag";
import "./Sheet.css";

const SIDES: readonly SheetSide[] = ["bottom", "top", "left", "right"];

/**
 * `<kernel-sheet>` — an edge-anchored sheet: `<kernel-dialog>` plus the gesture
 * layer it doesn't have. It *is* a `kernel-dialog` (it extends it), so every
 * attribute, part class, and the `close` event all carry over unchanged.
 *
 * Everything modal about this is the platform's — the real `<dialog>` is opened
 * with `showModal()`, so the focus trap, top-layer stacking, Escape handling,
 * `::backdrop`, and focus restoration are native rather than reimplemented.
 * What's added here is drag-to-dismiss with velocity, damped overdrag, and a
 * backdrop that tracks the drag.
 *
 * Attributes, on top of every `<kernel-dialog>` attribute: `side`
 * (bottom/top/left/right, default **bottom** rather than the dialog's centre),
 * `show-handle` (default true — set `"false"` to omit the grabber),
 * `handle-only` (only the handle starts a drag; worth setting whenever the
 * body scrolls), `dismissible` (default true — `"false"` disables both dragging
 * and backdrop dismissal), `close-threshold`, `velocity-threshold`, `inset`
 * (detach from the screen edges — all four corners rounded, a gap on three
 * sides, no JavaScript involved), `max-display-width` (a viewport width above
 * which the sheet closes itself, for a sheet on small screens and a centred
 * `<kernel-dialog>` on large ones), `snap-points` (comma or space separated
 * viewport percentages, e.g. `"25,55,92"` — a flick steps exactly one, a slower
 * release lands on the nearest, and dragging below the smallest dismisses.
 * Percentages are of the extent the sheet grows along, so `dvh` for bottom and
 * top and `dvw` for left and right), `snap` (the resting snap, reflected as it
 * changes; set it to retarget the sheet, or call `snapTo()`), `spring` (on by
 * default — a real spring carries the snap settle at the speed the finger was
 * moving; set `"false"` for the stylesheet's transition, or `"0.065,0.3"` to
 * tune attraction and friction).
 *
 * Part classes: everything `<kernel-dialog>` exposes, plus a
 * `data-slot="sheet-handle"` grabber, a `data-slot="sheet-body"` scroll region,
 * and — when a child carries `slot="footer"` — a pinned
 * `data-slot="sheet-footer"` that owns the bottom safe area and is a drag
 * surface in its own right.
 *
 * Events: `close` (inherited), plus `sheetdrag` (`detail.percent`, 0–1, on
 * every drag frame), `sheetrelease` (`detail.open`, whether the sheet stayed
 * open), and `snapchange` (`detail.from` / `detail.to`, once per settle that
 * actually moves). All bubble.
 *
 * The handle is `aria-hidden` decoration — the sheet is already dismissable by
 * Escape, the close button, and the backdrop — which is why it can be
 * absolutely positioned at the anchored edge instead of having to come first in
 * the DOM, ahead of the dialog's own `<header>`.
 */
export class KernelSheet extends KernelDialog {
  private handleElement: HTMLElement | null = null;
  private footerElement: HTMLElement | null = null;
  private bodyElement: HTMLElement | null = null;
  private bodyResizeObserver: ResizeObserver | null = null;
  private bodyScrollHandler: (() => void) | null = null;
  private drag: SheetDragController | null = null;
  private resizeHandler: (() => void) | null = null;
  private reflectingSnap = false;

  static get observedAttributes() {
    return [
      ...super.observedAttributes,
      "show-handle",
      "handle-only",
      "dismissible",
      "close-threshold",
      "velocity-threshold",
      "inset",
      "max-display-width",
      "snap-points",
      "snap",
      "spring",
    ];
  }

  connectedCallback() {
    const built = !this.native;
    super.connectedCallback();
    if (!built) return;

    const dialog = this.native as HTMLDialogElement | null;
    if (!dialog) return;
    dialog.classList.add(kernelClass("Sheet", "sheet"));

    // Capture on the host, not the dialog. Listeners registered on the event's
    // own target run in registration order regardless of their capture flag, and
    // KernelDialog registered its backdrop-click handler first — so the only
    // place a `dismissible="false"` guard can still get ahead of it is an
    // ancestor's capture phase.
    this.addEventListener(
      "click",
      (event) => {
        if (this.dismissible) return;
        if (event.target !== dialog) return;
        event.stopPropagation();
      },
      { capture: true },
    );

    this.drag = attachSheetDrag(dialog, () => this.dragOptions());
    this.syncHandle();
    this.restructureContent();

    // Unlike React's, this listener runs for the element's whole life rather
    // than only while open: the attribute check is cheap, and a custom element
    // has no render pass to hang an open-only effect from.
    this.resizeHandler = () => this.enforceDisplayWidth();
    window.addEventListener("resize", this.resizeHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.drag?.detach();
    this.drag = null;
    if (this.resizeHandler) window.removeEventListener("resize", this.resizeHandler);
    this.resizeHandler = null;
    this.bodyResizeObserver?.disconnect();
    this.bodyResizeObserver = null;
    if (this.bodyElement && this.bodyScrollHandler) {
      this.bodyElement.removeEventListener("scroll", this.bodyScrollHandler);
    }
    this.bodyElement = null;
    this.bodyScrollHandler = null;
  }

  /** A width limit closes the sheet rather than refusing to open it, so that
   * opening wide and widening while open land in the same place. */
  private enforceDisplayWidth() {
    if (!this.hasAttribute("open")) return;
    const limit = this.number("max-display-width", Number.POSITIVE_INFINITY);
    if (window.innerWidth > limit) this.removeAttribute("open");
  }

  private get dismissible() {
    return this.getAttribute("dismissible") !== "false";
  }

  /** Present-and-not-`"false"`, the shape every boolean-ish Kernel attribute
   * uses so both `handle-only` and `handle-only="true"` work. */
  private flag(name: string) {
    const value = this.getAttribute(name);
    return value !== null && value !== "false";
  }

  private number(name: string, fallback: number) {
    const raw = this.getAttribute(name);
    // `Number("")` is 0, which would turn `close-threshold=""` into "dismiss on
    // the slightest drag" rather than "use the default".
    if (raw === null || raw.trim() === "") return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private get side(): SheetSide {
    const value = this.getAttribute("side") as SheetSide | null;
    return value && SIDES.includes(value) ? value : "bottom";
  }

  private dragOptions(): SheetDragOptions {
    return {
      side: this.side,
      enabled: this.dismissible,
      handleOnly: this.flag("handle-only"),
      closeThreshold: this.number("close-threshold", DEFAULT_CLOSE_THRESHOLD),
      velocityThreshold: this.number("velocity-threshold", DEFAULT_VELOCITY_THRESHOLD),
      handle: this.handleElement,
      footer: this.footerElement,
      snapPoints: parseSnapPoints(this.getAttribute("snap-points")),
      snap: this.snapValue,
      animate: (settle) => {
        // Read at settle time, not cached: `prefers-reduced-motion` is a live
        // query, so flipping the OS setting takes effect without a remount.
        if (this.getAttribute("spring") === "false" || prefersReducedMotion()) {
          settle.onFrame(settle.toPx);
          settle.onDone();
          return () => {};
        }
        return runSpring({
          from: settle.fromPx,
          to: settle.toPx,
          // The gesture measures speed toward dismissal, which always *shrinks*
          // the sheet, while the animated value is the size being grown.
          velocity: -settle.velocityY,
          config: parseSpring(this.getAttribute("spring")),
          onFrame: settle.onFrame,
          onDone: settle.onDone,
        });
      },
      // Removing the attribute is the same path every other close takes:
      // KernelDialog's own `syncAttr` picks it up, runs the exit transition, and
      // only then calls the native `close()`.
      onDismiss: () => this.removeAttribute("open"),
      onDrag: (percent) =>
        this.dispatchEvent(new CustomEvent("sheetdrag", { detail: { percent }, bubbles: true })),
      onRelease: (open) =>
        this.dispatchEvent(new CustomEvent("sheetrelease", { detail: { open }, bubbles: true })),
      onSnapChange: (snap) => {
        const from = this.snapValue;
        // Flagged so this write isn't read back as an author retargeting the
        // sheet — that would supersede the settle that just reported it.
        this.reflectingSnap = true;
        this.setAttribute("snap", String(snap));
        this.reflectingSnap = false;
        if (from !== snap) {
          this.dispatchEvent(
            new CustomEvent("snapchange", { detail: { from, to: snap }, bubbles: true }),
          );
        }
      },
    };
  }

  private get snapValue(): number | null {
    const raw = this.getAttribute("snap");
    if (raw === null || raw.trim() === "") return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  /**
   * Splits Dialog's single content wrapper into a scrolling body and, when the
   * author supplied `slot="footer"`, a pinned footer — the same two slots
   * React's `Sheet` renders, so one stylesheet serves both.
   *
   * Runs after `super.connectedCallback()`, which means `syncHandle` may already
   * have prepended the handle in there; it's excluded explicitly rather than
   * relying on call order, since the handle must stay outside the scroller.
   */
  private restructureContent() {
    const dialog = this.native as HTMLDialogElement | null;
    const content = dialog?.querySelector('[data-slot="dialog-content"]');
    if (!content || content.querySelector('[data-slot="sheet-body"]')) return;

    const footerSource = content.querySelector(':scope > [slot="footer"]');
    const body = document.createElement("div");
    body.className = `${kernelClass("Sheet", "body")} ${kernelClass("ScrollArea")}`;
    body.setAttribute("data-slot", "sheet-body");
    body.setAttribute("data-edge-shadow", "");

    for (const node of Array.from(content.childNodes)) {
      if (node === footerSource || node === this.handleElement) continue;
      body.append(node);
    }
    content.append(body);
    this.bodyElement = body;
    const measure = () => {
      const scrollable = body.scrollHeight - body.clientHeight;
      const top = scrollable > 0 ? Math.min(body.scrollTop / 48, 1) : 0;
      const bottom = scrollable > 0 ? Math.min((scrollable - body.scrollTop) / 48, 1) : 0;
      body.style.setProperty("--kernel-scroll-shadow-top", String(top));
      body.style.setProperty("--kernel-scroll-shadow-bottom", String(bottom));
    };
    this.bodyScrollHandler = measure;
    body.addEventListener("scroll", measure, { passive: true });
    if (typeof ResizeObserver !== "undefined") {
      this.bodyResizeObserver = new ResizeObserver(measure);
      this.bodyResizeObserver.observe(body);
    }
    measure();

    if (footerSource) {
      const footer = document.createElement("div");
      footer.className = kernelClass("Sheet", "footer");
      footer.setAttribute("data-slot", "sheet-footer");
      footer.append(...Array.from(footerSource.childNodes));
      footerSource.remove();
      content.append(footer);
      this.footerElement = footer;
    }
  }

  private syncHandle() {
    const dialog = this.native as HTMLDialogElement | null;
    if (!dialog) return;
    const wanted = this.getAttribute("show-handle") !== "false";

    if (!wanted) {
      this.handleElement?.remove();
      this.handleElement = null;
      return;
    }
    if (this.handleElement) return;

    const handle = document.createElement("div");
    handle.className = kernelClass("Sheet", "handle");
    handle.setAttribute("data-slot", "sheet-handle");
    handle.setAttribute("aria-hidden", "true");
    const bar = document.createElement("span");
    bar.className = kernelClass("Sheet", "handleBar");
    handle.append(bar);

    // Inside the dialog's content wrapper, so it lands in the same place React's
    // `Sheet` puts it and the CSS is shared. Position, not DOM order, is what
    // puts it at the anchored edge.
    const body = dialog.querySelector('[data-slot="dialog-content"]');
    (body ?? dialog).prepend(handle);
    this.handleElement = handle;
  }

  protected syncAttr(name: string, value: string | null) {
    // A drag that ended in dismissal leaves its translate behind on purpose so
    // the exit transition can continue from it. Clear it before the dialog is
    // shown again, or the first frame starts off-screen and jumps.
    if (name === "open" && value !== null) this.drag?.reset();

    super.syncAttr(name, value);

    const dialog = this.native as HTMLDialogElement | null;

    switch (name) {
      case "side": {
        // A sheet with no `side` is a bottom sheet, where a dialog with no
        // `side` is a centred card.
        dialog?.setAttribute("data-side", this.side);
        // The side decides which CSS property a snap is written to, so switching
        // it has to re-apply the resting size and clear the axis the snap used to
        // live on — a stale inline `height` would keep pinning a sheet that now
        // grows along its inline axis.
        if (this.hasAttribute("open")) this.drag?.reset();
        break;
      }
      case "snap-points":
        // Same reasoning: gaining or losing snaps changes whether the sheet has a
        // size of its own at all.
        if (this.hasAttribute("open")) this.drag?.reset();
        break;
      case "show-handle":
        this.syncHandle();
        break;
      case "inset":
        dialog?.classList.toggle(kernelClass("Sheet", "inset"), this.flag("inset"));
        break;
      case "open":
      case "max-display-width":
        this.enforceDisplayWidth();
        break;
      case "snap": {
        // Only an author's write retargets the sheet; the reflection above is
        // this component reporting where a settle already went.
        if (this.reflectingSnap) break;
        const next = this.snapValue;
        if (next !== null) this.drag?.snapTo(next);
        break;
      }
    }
  }

  /** Moves the sheet to a snap, the scripted equivalent of setting `snap`. */
  snapTo(snap: number) {
    this.drag?.snapTo(snap);
  }

  get snap(): number | null {
    return this.drag?.currentSnap() ?? this.snapValue;
  }

  get snapPoints(): number[] {
    return parseSnapPoints(this.getAttribute("snap-points"));
  }
}

customElements.define("kernel-sheet", KernelSheet);
