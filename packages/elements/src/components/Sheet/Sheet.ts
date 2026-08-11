import { kernelClass } from "../../base";
// Import order is load-bearing: `Dialog` pulls in `Dialog.css`, and `Sheet.css`
// has to land *after* it in the bundle. Sheet's per-side rules are
// specificity-matched to Dialog's rather than escalated above them, so source
// order is what decides them. Don't reorder these two imports.
import { KernelDialog } from "../Dialog/Dialog";
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
 * `<kernel-dialog>` on large ones).
 *
 * Part classes: everything `<kernel-dialog>` exposes, plus a
 * `data-slot="sheet-handle"` grabber.
 *
 * Events: `close` (inherited), plus `sheetdrag` (`detail.percent`, 0–1, on
 * every drag frame) and `sheetrelease` (`detail.open`, whether the sheet stayed
 * open). Both bubble.
 *
 * The handle is `aria-hidden` decoration — the sheet is already dismissable by
 * Escape, the close button, and the backdrop — which is why it can be
 * absolutely positioned at the anchored edge instead of having to come first in
 * the DOM, ahead of the dialog's own `<header>`.
 */
export class KernelSheet extends KernelDialog {
  private handleElement: HTMLElement | null = null;
  private drag: SheetDragController | null = null;
  private resizeHandler: (() => void) | null = null;

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
      // Removing the attribute is the same path every other close takes:
      // KernelDialog's own `syncAttr` picks it up, runs the exit transition, and
      // only then calls the native `close()`.
      onDismiss: () => this.removeAttribute("open"),
      onDrag: (percent) =>
        this.dispatchEvent(new CustomEvent("sheetdrag", { detail: { percent }, bubbles: true })),
      onRelease: (open) =>
        this.dispatchEvent(new CustomEvent("sheetrelease", { detail: { open }, bubbles: true })),
    };
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
        break;
      }
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
    }
  }
}

customElements.define("kernel-sheet", KernelSheet);
