import { KernelElement, kernelClass } from "../../base";
import "./Resizable.css";

const SMALL_STEP = 2;
const LARGE_STEP = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * `<kernel-resizable>` — a two-pane splitter. Exactly two element
 * children are expected (the two panes); everything else about the
 * drag/keyboard behaviour mirrors `@kernelui-lib/react`'s `<Resizable>`
 * exactly (same `role="separator"` divider, same arrow-key stepping,
 * same pointer-capture drag).
 *
 * Attributes: `orientation` (`horizontal` default | `vertical`),
 * `default-split` (percentage, read once at connect), `min` (default
 * 20), `max` (default 80) — `min`/`max` are live and reclamp the
 * current split when changed.
 */
export class KernelResizable extends KernelElement {
  private split = 50;
  private dragging = false;
  private divider: HTMLElement | null = null;

  static get observedAttributes() {
    return ["orientation", "min", "max"];
  }

  private get orientation(): "horizontal" | "vertical" {
    return this.getAttribute("orientation") === "vertical" ? "vertical" : "horizontal";
  }

  private get min(): number {
    return Number(this.getAttribute("min") ?? "20");
  }

  private get max(): number {
    return Number(this.getAttribute("max") ?? "80");
  }

  connectedCallback() {
    if (this.native) return;

    const panes = Array.from(this.children);
    const [paneA, paneB] = panes;

    const root = document.createElement("div");
    root.className = kernelClass("Resizable");

    const paneEl1 = document.createElement("div");
    paneEl1.className = kernelClass("Resizable", "pane");
    if (paneA) paneEl1.append(paneA);

    const divider = document.createElement("div");
    divider.setAttribute("role", "separator");
    divider.tabIndex = 0;
    divider.className = kernelClass("Resizable", "divider");
    this.divider = divider;

    const paneEl2 = document.createElement("div");
    paneEl2.className = kernelClass("Resizable", "pane");
    if (paneB) paneEl2.append(paneB);

    root.append(paneEl1, divider, paneEl2);
    this.native = root;
    this.append(root);

    const defaultSplit = Number(this.getAttribute("default-split") ?? "50");
    this.split = clamp(defaultSplit, this.min, this.max);

    divider.addEventListener("pointerdown", (event) => this.handlePointerDown(event));
    divider.addEventListener("pointermove", (event) => this.handlePointerMove(event));
    divider.addEventListener("pointerup", (event) => this.handlePointerUp(event));
    divider.addEventListener("keydown", (event) => this.handleKeyDown(event));

    this.syncAllAttrs();
    this.render();
  }

  private handlePointerDown(event: PointerEvent) {
    this.divider?.setPointerCapture(event.pointerId);
    this.dragging = true;
    document.body.style.cursor = this.orientation === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
    this.render();
  }

  private handlePointerMove(event: PointerEvent) {
    if (!this.divider?.hasPointerCapture(event.pointerId)) return;
    const rect = this.native?.getBoundingClientRect();
    if (!rect) return;
    const percent =
      this.orientation === "horizontal"
        ? ((event.clientX - rect.left) / rect.width) * 100
        : ((event.clientY - rect.top) / rect.height) * 100;
    this.split = clamp(percent, this.min, this.max);
    this.render();
  }

  private handlePointerUp(event: PointerEvent) {
    this.divider?.releasePointerCapture(event.pointerId);
    this.dragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    this.render();
  }

  private handleKeyDown(event: KeyboardEvent) {
    const step = event.shiftKey ? LARGE_STEP : SMALL_STEP;
    const decreaseKey = this.orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    const increaseKey = this.orientation === "horizontal" ? "ArrowRight" : "ArrowDown";

    if (event.key === decreaseKey) {
      event.preventDefault();
      this.split = clamp(this.split - step, this.min, this.max);
    } else if (event.key === increaseKey) {
      event.preventDefault();
      this.split = clamp(this.split + step, this.min, this.max);
    } else if (event.key === "Home") {
      event.preventDefault();
      this.split = this.min;
    } else if (event.key === "End") {
      event.preventDefault();
      this.split = this.max;
    } else {
      return;
    }
    this.render();
  }

  protected syncAttr(name: string, _value: string | null) {
    if (!this.native) return;
    if (name === "min" || name === "max") {
      this.split = clamp(this.split, this.min, this.max);
    }
    this.render();
  }

  private render() {
    const root = this.native;
    const divider = this.divider;
    if (!root || !divider) return;

    root.setAttribute("data-orientation", this.orientation);
    if (this.dragging) root.setAttribute("data-dragging", "");
    else root.removeAttribute("data-dragging");
    root.style.setProperty("--kernel-resizable-split", `${this.split}%`);

    divider.setAttribute("aria-orientation", this.orientation === "horizontal" ? "vertical" : "horizontal");
    divider.setAttribute("aria-valuenow", String(Math.round(this.split)));
    divider.setAttribute("aria-valuemin", String(this.min));
    divider.setAttribute("aria-valuemax", String(this.max));
    if (this.dragging) divider.setAttribute("data-dragging", "");
    else divider.removeAttribute("data-dragging");
  }
}

customElements.define("kernel-resizable", KernelResizable);
