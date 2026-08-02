import { KernelElement, kernelClass } from "../../base";
import { DetailsPanelAnimator } from "../../utils/detailsTransition";
import "./ToolCall.css";

const CHEVRON = "M4 6L8 10L12 6";

function svg(paths: string[], className: string, attrs?: Record<string, string>): SVGSVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  el.setAttribute("viewBox", "0 0 16 16");
  el.setAttribute("fill", "none");
  el.setAttribute("aria-hidden", "true");
  el.setAttribute("class", className);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  }
  for (const d of paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.25");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    el.append(path);
  }
  return el;
}

function statusIcon(status: string): SVGSVGElement {
  if (status === "complete") {
    const el = svg(
      ["M5.25 8.25 7 10l3.75-4"],
      kernelClass("ToolCall", "icon"),
    );
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "8");
    circle.setAttribute("cy", "8");
    circle.setAttribute("r", "6.25");
    circle.setAttribute("stroke", "currentColor");
    circle.setAttribute("stroke-width", "1.25");
    el.prepend(circle);
    return el;
  }
  if (status === "error") {
    const el = svg(["M8 5v3.5M8 11h.01"], kernelClass("ToolCall", "icon"));
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "8");
    circle.setAttribute("cy", "8");
    circle.setAttribute("r", "6.25");
    circle.setAttribute("stroke", "currentColor");
    circle.setAttribute("stroke-width", "1.25");
    el.prepend(circle);
    return el;
  }
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  el.setAttribute("viewBox", "0 0 16 16");
  el.setAttribute("fill", "none");
  el.setAttribute("aria-hidden", "true");
  el.setAttribute("class", kernelClass("ToolCall", "icon"));
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "8");
  circle.setAttribute("cy", "8");
  circle.setAttribute("r", "6.25");
  circle.setAttribute("stroke", "currentColor");
  circle.setAttribute("stroke-width", "1.25");
  circle.setAttribute("stroke-dasharray", "2.5 2.5");
  circle.setAttribute("stroke-linecap", "round");
  el.append(circle);
  return el;
}

/**
 * `<kernel-tool-call>` — a collapsible agent tool-invocation status on
 * real `<details>`/`<summary>` (same foundation as `<kernel-reasoning>`).
 *
 * Attributes: `label` (status line text), `status`
 * (`pending` | `running` | `complete` | `error`, default `pending`),
 * `default-open` (read once at connect). Light-DOM children become the
 * results panel; with no children, renders as a non-collapsible status row.
 */
export class KernelToolCall extends KernelElement {
  private animator: DetailsPanelAnimator | undefined;
  private hasResults = false;

  static get observedAttributes() {
    return ["label", "status"];
  }

  connectedCallback() {
    if (this.native) return;

    const content = Array.from(this.childNodes).filter(
      (node) => !(node instanceof Element && node.getAttribute("slot") === "label"),
    );
    const labelSlot = this.querySelector('[slot="label"]');
    for (const node of Array.from(this.childNodes)) {
      node.parentNode?.removeChild(node);
    }

    this.hasResults = content.some(
      (node) =>
        node.nodeType === Node.ELEMENT_NODE ||
        (node.nodeType === Node.TEXT_NODE && (node.textContent?.trim() ?? "").length > 0),
    );

    if (!this.hasResults) {
      const root = document.createElement("div");
      root.setAttribute("role", "status");
      root.className = `${kernelClass("ToolCall")} ${kernelClass("ToolCall", "static")}`;
      const label = document.createElement("span");
      label.className = kernelClass("ToolCall", "summaryContent");
      root.append(label);
      this.native = root;
      this.append(root);
      this.syncAllAttrs();
      if (labelSlot) {
        // Prefer attribute label; slot only if no attribute.
      }
      return;
    }

    const details = document.createElement("details");
    details.className = kernelClass("ToolCall");
    const defaultOpen =
      this.hasAttribute("default-open") ||
      (() => {
        const status = this.getAttribute("status") ?? "pending";
        return status === "running" || status === "pending";
      })();

    const summary = document.createElement("summary");
    summary.className = kernelClass("ToolCall", "trigger");

    const summaryContent = document.createElement("span");
    summaryContent.className = kernelClass("ToolCall", "summaryContent");

    const chevron = svg([CHEVRON], kernelClass("ToolCall", "chevron"));
    // Chevron path uses thicker stroke in React — match.
    chevron.querySelector("path")?.setAttribute("stroke-width", "1.75");

    summary.append(summaryContent, chevron);

    const contentEl = document.createElement("div");
    contentEl.className = kernelClass("ToolCall", "content");
    contentEl.append(...content);

    details.append(summary, contentEl);
    this.animator = new DetailsPanelAnimator(details, contentEl);
    if (defaultOpen) this.animator.snapOpen(true);

    this.native = details;
    this.append(details);
    this.syncAllAttrs();
  }

  disconnectedCallback() {
    this.animator?.destroy();
    this.animator = undefined;
  }

  private renderSummary() {
    const root = this.native;
    if (!root) return;
    const summaryContent = root.querySelector<HTMLElement>(
      `.${kernelClass("ToolCall", "summaryContent")}`,
    );
    if (!summaryContent) return;

    const status = this.getAttribute("status") ?? "pending";
    const labelText = this.getAttribute("label") ?? "Tool call";
    root.setAttribute("data-status", status);
    summaryContent.replaceChildren();

    if (status === "running") {
      const label = document.createElement("span");
      label.className = kernelClass("ToolCall", "label");
      if (this.hasResults) label.setAttribute("role", "status");

      const dots = document.createElement("span");
      dots.className = kernelClass("ToolCall", "dots");
      dots.setAttribute("aria-hidden", "true");
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement("span");
        dot.className = kernelClass("ToolCall", "dot");
        dots.append(dot);
      }

      const shimmer = document.createElement("span");
      shimmer.className = kernelClass("ToolCall", "shimmer");
      shimmer.textContent = labelText;

      label.append(dots, shimmer);
      summaryContent.append(label);
      return;
    }

    const label = document.createElement("span");
    label.className = kernelClass("ToolCall", "label");
    label.append(statusIcon(status));
    const text = document.createElement("span");
    text.className = kernelClass("ToolCall", "labelText");
    text.textContent = labelText;
    label.append(text);
    summaryContent.append(label);
  }

  protected syncAttr(name: string, _value: string | null) {
    if (name === "label" || name === "status") this.renderSummary();
  }
}

customElements.define("kernel-tool-call", KernelToolCall);
