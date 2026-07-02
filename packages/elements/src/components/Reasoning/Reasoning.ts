import { KernelElement, kernelClass } from "../../base";
import "../ThinkingIndicator/ThinkingIndicator";
import "./Reasoning.css";

const supportsAnimatedDetails =
  typeof CSS !== "undefined" && CSS.supports("selector(::details-content)");

const CHEVRON_PATH = "M4 6L8 10L12 6";
const REASONING_ICON_PATHS = [
  "M8 1.5a5 5 0 0 0-3 9l.5 3h5l.5-3a5 5 0 0 0-3-9Z",
  "M6.25 14.5h3.5",
];

function svg(paths: string[], className: string): SVGSVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  el.setAttribute("viewBox", "0 0 16 16");
  el.setAttribute("fill", "none");
  el.setAttribute("aria-hidden", "true");
  el.setAttribute("class", className);
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

/**
 * `<kernel-reasoning>` — a collapsible AI reasoning/thinking trace,
 * its own `<details>`/`<summary>` (not a wrapped Accordion item — see
 * `@kernelui/react`'s own `<Reasoning>` for why). Attributes:
 * `streaming` (auto-opens while present; auto-closes ~600ms after it's
 * removed, unless the user has manually interacted with the summary
 * since), `duration-label` (text shown once streaming ends, default
 * "Reasoning"), `default-open` (read once at connect).
 */
export class KernelReasoning extends KernelElement {
  private wasStreaming = false;
  private collapseTimer: ReturnType<typeof setTimeout> | undefined;
  private transitionTimer: ReturnType<typeof setTimeout> | undefined;

  static get observedAttributes() {
    return ["streaming", "duration-label"];
  }

  connectedCallback() {
    if (this.native) return;

    const content = Array.from(this.childNodes);
    for (const node of content) node.parentNode?.removeChild(node);

    const details = document.createElement("details");
    details.className = kernelClass("Reasoning");

    const summary = document.createElement("summary");
    summary.className = kernelClass("Reasoning", "trigger");

    const summaryContent = document.createElement("span");
    summaryContent.className = kernelClass("Reasoning", "summaryContent");
    const chevron = svg([CHEVRON_PATH], kernelClass("Reasoning", "chevron"));
    summary.append(summaryContent, chevron);

    const contentEl = document.createElement("div");
    contentEl.className = kernelClass("Reasoning", "content");
    contentEl.append(...content);

    details.append(summary, contentEl);
    this.native = details;
    this.append(details);

    this.wasStreaming = this.hasAttribute("streaming");
    if (this.hasAttribute("default-open") || this.wasStreaming) details.open = true;

    details.addEventListener("toggle", () => {
      if (supportsAnimatedDetails) this.markTransitioning(details.open);
    });

    this.renderSummary();
  }

  disconnectedCallback() {
    clearTimeout(this.collapseTimer);
    clearTimeout(this.transitionTimer);
  }

  private markTransitioning(opening: boolean) {
    const details = this.native as HTMLDetailsElement;
    details.setAttribute("data-state", opening ? "opening" : "closing");
    clearTimeout(this.transitionTimer);
    const durationMs =
      parseFloat(getComputedStyle(details).getPropertyValue("--kernel-duration-base")) || 200;
    this.transitionTimer = setTimeout(() => details.removeAttribute("data-state"), durationMs);
  }

  private renderSummary() {
    const details = this.native as HTMLDetailsElement | null;
    if (!details) return;
    const summaryContent = details.querySelector<HTMLElement>(
      `.${kernelClass("Reasoning", "summaryContent")}`,
    );
    if (!summaryContent) return;

    summaryContent.replaceChildren();
    if (this.hasAttribute("streaming")) {
      const indicator = document.createElement("kernel-thinking-indicator");
      indicator.setAttribute("label", "Thinking");
      summaryContent.append(indicator);
    } else {
      const label = document.createElement("span");
      label.className = kernelClass("Reasoning", "label");
      label.append(svg(REASONING_ICON_PATHS, kernelClass("Reasoning", "icon")));
      const text = document.createElement("span");
      text.textContent = this.getAttribute("duration-label") || "Reasoning";
      label.append(text);
      summaryContent.append(label);
    }
  }

  protected syncAttr(name: string, _value: string | null) {
    const details = this.native as HTMLDetailsElement | null;
    if (!details) return;

    if (name === "streaming") {
      const streaming = this.hasAttribute("streaming");
      this.renderSummary();
      if (this.wasStreaming === streaming) return;
      this.wasStreaming = streaming;
      clearTimeout(this.collapseTimer);
      if (streaming) {
        details.open = true;
      } else {
        this.collapseTimer = setTimeout(() => {
          details.open = false;
        }, 600);
      }
    } else if (name === "duration-label") {
      this.renderSummary();
    }
  }
}

customElements.define("kernel-reasoning", KernelReasoning);
